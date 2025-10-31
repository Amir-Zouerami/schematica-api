import SwaggerParser from '@apidevtools/swagger-parser';
import { ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { AccessType, Prisma, Role } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { type OpenAPIV3 } from 'openapi-types';
import { UserDto } from 'src/auth/dto/user.dto';
import { PrismaErrorCode } from 'src/common/constants/prisma-error-codes.constants';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { ProjectConcurrencyException } from 'src/common/exceptions/project-concurrency.exception';
import { ProjectConflictException } from 'src/common/exceptions/project-conflict.exception';
import { ProjectCreationFailure } from 'src/common/exceptions/project-creation-failure.exception';
import { ProjectNotFoundException } from 'src/common/exceptions/project-not-found.exception';
import { SpecValidationException } from 'src/common/exceptions/spec-validation.exception';
import { PaginatedServiceResponse } from 'src/common/interfaces/api-response.interface';
import { handlePrismaError } from 'src/common/utils/prisma-error.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectDetailDto } from './dto/project-detail.dto';
import { ProjectSummaryDto } from './dto/project-summary.dto';
import { UpdateAccessDto } from './dto/update-access.dto';
import { UpdateOpenApiSpecDto } from './dto/update-openapi-spec.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { OpenApiSpecBuilder } from './spec-builder/openapi-spec.builder';
import { SpecReconciliationService } from './spec-reconciliation/spec-reconciliation.service';

const projectDetailInclude = {
	creator: true,
	updatedBy: true,
	links: true,
	userAccesses: { select: { userId: true, type: true } },
	teamAccesses: { select: { teamId: true, type: true } },
	deniedUsers: { select: { id: true } },
} satisfies Prisma.ProjectInclude;

@Injectable()
export class ProjectsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly logger: PinoLogger,
		private readonly specBuilder: OpenApiSpecBuilder,
		private readonly specReconciliationService: SpecReconciliationService,
	) {
		this.logger.setContext(ProjectsService.name);
	}

	async create(createProjectDto: CreateProjectDto, creator: UserDto): Promise<ProjectDetailDto> {
		const { name, description, serverUrl, links } = createProjectDto;

		try {
			const newProject = await this.prisma.$transaction(async (tx) => {
				const project = await tx.project.create({
					data: {
						name,
						nameNormalized: name.toLowerCase(),
						description,
						serverUrl,
						creatorId: creator.id,
						updatedById: creator.id,
						links: links
							? {
									create: links.map((link) => ({
										name: link.name,
										url: link.url,
									})),
								}
							: undefined,
					},
				});

				await tx.userProjectAccess.create({
					data: {
						userId: creator.id,
						projectId: project.id,
						type: AccessType.OWNER,
					},
				});

				return tx.project.findUniqueOrThrow({
					where: { id: project.id },
					include: projectDetailInclude,
				});
			});

			return new ProjectDetailDto(newProject);
		} catch (error) {
			this.logger.error({ error: error as unknown }, 'Failed to create project.');

			handlePrismaError(error, {
				[PrismaErrorCode.UniqueConstraintFailed]: new ProjectConflictException(
					createProjectDto.name,
				),
				default: new ProjectCreationFailure(createProjectDto.name),
			});
		}
	}

	async findAllForUser(
		user: UserDto,
		paginationQuery: PaginationQueryDto,
	): Promise<PaginatedServiceResponse<ProjectSummaryDto>> {
		try {
			const { skip, limit, page } = paginationQuery;
			const where = this._createAccessControlWhereClause(user);

			const [projects, total] = await this.prisma.$transaction([
				this.prisma.project.findMany({
					include: {
						creator: true,
						updatedBy: true,
					},
					where,
					skip,
					take: limit,
					orderBy: { updatedAt: 'desc' },
				}),
				this.prisma.project.count({ where }),
			]);

			return {
				data: projects.map((p) => new ProjectSummaryDto(p)),
				meta: {
					total,
					page,
					limit,
					lastPage: Math.ceil(total / limit) || 1,
				},
			};
		} catch (error) {
			this.logger.error({ error: error as unknown }, 'Failed to find projects for user.');
			handlePrismaError(error);
		}
	}

	async findOneByIdForUser(projectId: string, user: UserDto): Promise<ProjectDetailDto> {
		try {
			const where = this._createAccessControlWhereClause(user);
			const project = await this.prisma.project.findFirst({
				where: { AND: [{ id: projectId }, where] },
				include: projectDetailInclude,
			});

			if (!project) {
				throw new ProjectNotFoundException(projectId);
			}

			return new ProjectDetailDto(project);
		} catch (error) {
			if (error instanceof ProjectNotFoundException) throw error;

			this.logger.error(
				{ error: error as unknown },
				`Failed to find project by ID ${projectId}.`,
			);

			handlePrismaError(error);
		}
	}

	async update(
		projectId: string,
		updateProjectDto: UpdateProjectDto,
		updater: UserDto,
	): Promise<ProjectDetailDto> {
		const { name, lastKnownUpdatedAt, links, ...otherData } = updateProjectDto;

		try {
			const projectExists = await this.prisma.project.findUnique({
				where: { id: projectId },
			});
			if (!projectExists) {
				throw new ProjectNotFoundException(projectId);
			}

			const updatedProject = await this.prisma.$transaction(async (tx) => {
				await tx.project.findUniqueOrThrow({
					where: {
						id: projectId,
						updatedAt: new Date(lastKnownUpdatedAt),
					},
				});

				if (links !== undefined) {
					await tx.projectLink.deleteMany({ where: { projectId } });
				}

				return tx.project.update({
					where: { id: projectId },
					data: {
						name,
						nameNormalized: name ? name.toLowerCase() : undefined,
						...otherData,
						updatedById: updater.id,
						links:
							links !== undefined
								? {
										create: links.map((link) => ({
											name: link.name,
											url: link.url,
										})),
									}
								: undefined,
					},
					include: projectDetailInclude,
				});
			});

			return new ProjectDetailDto(updatedProject);
		} catch (error) {
			if (error instanceof ProjectNotFoundException) {
				throw error;
			}

			this.logger.error(
				{ error: error as unknown },
				`Failed to update project ${projectId}.`,
			);

			handlePrismaError(error, {
				[PrismaErrorCode.RecordNotFound]: new ProjectConcurrencyException(),
				[PrismaErrorCode.UniqueConstraintFailed]: new ProjectConflictException(
					updateProjectDto.name,
				),
			});
		}
	}

	async updateAccess(
		projectId: string,
		updateAccessDto: UpdateAccessDto,
		currentUser: UserDto,
	): Promise<ProjectDetailDto> {
		const { owners, viewers, deniedUsers, lastKnownUpdatedAt } = updateAccessDto;

		if (currentUser.role !== Role.admin && !owners.users.includes(currentUser.id)) {
			throw new ForbiddenException(
				'Project owners cannot remove themselves from the owner list.',
			);
		}

		try {
			const projectExists = await this.prisma.project.findUnique({
				where: { id: projectId },
			});
			if (!projectExists) {
				throw new ProjectNotFoundException(projectId);
			}

			const updatedProject = await this.prisma.$transaction(async (tx) => {
				await tx.project.findFirstOrThrow({
					where: { id: projectId, updatedAt: new Date(lastKnownUpdatedAt) },
				});

				await Promise.all([
					tx.userProjectAccess.deleteMany({ where: { projectId } }),
					tx.teamProjectAccess.deleteMany({ where: { projectId } }),
				]);

				const createOwnerUsers =
					owners.users.length > 0
						? tx.userProjectAccess.createMany({
								data: owners.users.map((userId) => ({
									projectId,
									userId,
									type: AccessType.OWNER,
								})),
							})
						: Promise.resolve();
				const createOwnerTeams =
					owners.teams.length > 0
						? tx.teamProjectAccess.createMany({
								data: owners.teams.map((teamId) => ({
									projectId,
									teamId,
									type: AccessType.OWNER,
								})),
							})
						: Promise.resolve();
				const createViewerUsers =
					viewers.users.length > 0
						? tx.userProjectAccess.createMany({
								data: viewers.users.map((userId) => ({
									projectId,
									userId,
									type: AccessType.VIEWER,
								})),
							})
						: Promise.resolve();
				const createViewerTeams =
					viewers.teams.length > 0
						? tx.teamProjectAccess.createMany({
								data: viewers.teams.map((teamId) => ({
									projectId,
									teamId,
									type: AccessType.VIEWER,
								})),
							})
						: Promise.resolve();

				await Promise.all([
					createOwnerUsers,
					createOwnerTeams,
					createViewerUsers,
					createViewerTeams,
				]);

				return tx.project.update({
					where: { id: projectId },
					data: {
						deniedUsers: { set: deniedUsers.map((userId) => ({ id: userId })) },
						updatedById: currentUser.id,
					},
					include: projectDetailInclude,
				});
			});

			return new ProjectDetailDto(updatedProject);
		} catch (error) {
			if (error instanceof ProjectNotFoundException || error instanceof ForbiddenException) {
				throw error;
			}

			this.logger.error(
				{ error: error as unknown },
				`Failed to update access for project ${projectId}.`,
			);

			handlePrismaError(error, {
				[PrismaErrorCode.RecordNotFound]: new ProjectConcurrencyException(),
			});
		}
	}

	async delete(projectId: string): Promise<void> {
		try {
			await this.prisma.project.delete({ where: { id: projectId } });
		} catch (error) {
			this.logger.error(
				{ error: error as unknown },
				`Failed to delete project ${projectId}.`,
			);

			handlePrismaError(error, {
				[PrismaErrorCode.RecordNotFound]: new ProjectNotFoundException(projectId),
			});
		}
	}

	async getOpenApiSpec(projectId: string, user: UserDto): Promise<Prisma.JsonValue> {
		try {
			const where = this._createAccessControlWhereClause(user);
			const projectWithEndpoints = await this.prisma.project.findFirst({
				where: { AND: [{ id: projectId }, where] },
				include: {
					endpoints: {
						select: { path: true, method: true, operation: true },
						orderBy: { path: 'asc' },
					},
				},
			});

			if (!projectWithEndpoints) {
				throw new ProjectNotFoundException(projectId);
			}

			return this.specBuilder.build(projectWithEndpoints, projectWithEndpoints.endpoints);
		} catch (error) {
			if (error instanceof ProjectNotFoundException) throw error;

			this.logger.error(
				{ error: error as unknown },
				`Failed to get OpenAPI spec for project ${projectId}.`,
			);

			handlePrismaError(error);
		}
	}

	async importOpenApiSpec(
		projectId: string,
		updateOpenApiSpecDto: UpdateOpenApiSpecDto,
		user: UserDto,
	): Promise<ProjectDetailDto> {
		const { spec, lastKnownUpdatedAt } = updateOpenApiSpecDto;

		try {
			let dereferencedSpec: OpenAPIV3.Document;

			try {
				dereferencedSpec = (await SwaggerParser.dereference(
					spec as OpenAPIV3.Document,
				)) as OpenAPIV3.Document;
			} catch (err) {
				if (err instanceof Error) {
					throw new SpecValidationException(err.message);
				}

				throw new SpecValidationException('An unknown validation error occurred.');
			}

			const updatedProject = await this.prisma.$transaction(async (tx) => {
				const project = await tx.project.findUniqueOrThrow({
					where: { id: projectId, updatedAt: new Date(lastKnownUpdatedAt) },
					include: { endpoints: true },
				});

				const { toCreate, toUpdate, toDeleteIds } =
					this.specReconciliationService.reconcile(
						project.endpoints,
						dereferencedSpec,
						user,
						projectId,
					);

				if (toDeleteIds.length > 0) {
					await tx.endpoint.deleteMany({ where: { id: { in: toDeleteIds } } });
				}

				if (toCreate.length > 0) {
					await tx.endpoint.createMany({ data: toCreate });
				}

				if (toUpdate.length > 0) {
					await Promise.all(
						toUpdate.map((u) =>
							tx.endpoint.update({
								where: { id: u.id },
								data: { operation: u.operation, updatedById: u.updatedById },
							}),
						),
					);
				}

				const serverUrl = dereferencedSpec.servers?.[0]?.url ?? null;
				return tx.project.update({
					where: { id: projectId },
					data: {
						name: dereferencedSpec.info.title,
						nameNormalized: dereferencedSpec.info.title.toLowerCase(),
						description: dereferencedSpec.info.description,
						serverUrl,
						updatedById: user.id,
					},
					include: projectDetailInclude,
				});
			});

			return new ProjectDetailDto(updatedProject);
		} catch (error) {
			if (error instanceof SpecValidationException) throw error;

			this.logger.error(
				{ error: error as unknown },
				`Failed to import OpenAPI spec for project ${projectId}.`,
			);

			handlePrismaError(error, {
				[PrismaErrorCode.RecordNotFound]: new ProjectConcurrencyException(),
				[PrismaErrorCode.UniqueConstraintFailed]: new ProjectConflictException(
					spec.info.title,
				),
				default: new InternalServerErrorException(
					'Failed to import OpenAPI specification.',
				),
			});
		}
	}

	private _createAccessControlWhereClause(user: UserDto): Prisma.ProjectWhereInput {
		if (user.role === Role.admin) {
			return {};
		}

		return {
			deniedUsers: { none: { id: user.id } },
			OR: [
				{ userAccesses: { some: { userId: user.id } } },
				{
					teamAccesses: {
						some: { teamId: { in: user.teams?.map((t) => t.id) } },
					},
				},
			],
		};
	}
}
