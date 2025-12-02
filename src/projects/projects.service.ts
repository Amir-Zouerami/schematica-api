import SwaggerParser from '@apidevtools/swagger-parser';
import { ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OpenAPIObject } from '@nestjs/swagger';
import { AccessType, Prisma, Role } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { type OpenAPIV3 } from 'openapi-types';
import { ApiLintingService } from 'src/api-linting/api-linting.service';
import { AuditAction, AuditEvent, AuditLogEvent } from 'src/audit/audit.events';
import { UserDto } from 'src/auth/dto/user.dto';
import { PrismaErrorCode } from 'src/common/constants/prisma-error-codes.constants';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { ProjectConcurrencyException } from 'src/common/exceptions/project-concurrency.exception';
import { ProjectConflictException } from 'src/common/exceptions/project-conflict.exception';
import { ProjectCreationFailure } from 'src/common/exceptions/project-creation-failure.exception';
import { ProjectNotFoundException } from 'src/common/exceptions/project-not-found.exception';
import { SpecCircularDependencyException } from 'src/common/exceptions/spec-circular-dependency.exception';
import { SpecLintingException } from 'src/common/exceptions/spec-linting.exception';
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
	userAccesses: {
		include: {
			user: {
				select: { id: true, username: true, profileImage: true },
			},
		},
	},
	teamAccesses: {
		include: {
			team: true,
		},
	},
	deniedUsers: {
		select: { id: true, username: true, profileImage: true },
	},
} satisfies Prisma.ProjectInclude;

@Injectable()
export class ProjectsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly logger: PinoLogger,
		private readonly specBuilder: OpenApiSpecBuilder,
		private readonly specReconciliationService: SpecReconciliationService,
		private readonly eventEmitter: EventEmitter2,
		private readonly apiLintingService: ApiLintingService,
	) {
		this.logger.setContext(ProjectsService.name);
	}

	async create(createProjectDto: CreateProjectDto, creator: UserDto): Promise<ProjectDetailDto> {
		const { name, description, servers, links } = createProjectDto;

		try {
			const newProject = await this.prisma.$transaction(async (tx) => {
				const project = await tx.project.create({
					data: {
						name,
						nameNormalized: name.toLowerCase(),
						description,
						servers: (servers as unknown as Prisma.JsonArray) ?? Prisma.JsonNull,
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

			this.eventEmitter.emit(AuditEvent, {
				actor: creator,
				action: AuditAction.PROJECT_CREATED,
				targetId: newProject.id,
				details: { name: newProject.name },
			} satisfies AuditLogEvent);

			return new ProjectDetailDto(newProject);
		} catch (error: unknown) {
			this.logger.error({ error }, 'Failed to create project.');

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
		} catch (error: unknown) {
			this.logger.error({ error }, 'Failed to find projects for user.');
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
		} catch (error: unknown) {
			if (error instanceof ProjectNotFoundException) throw error;

			this.logger.error({ error }, `Failed to find project by ID ${projectId}.`);

			handlePrismaError(error);
		}
	}

	async update(
		projectId: string,
		updateProjectDto: UpdateProjectDto,
		updater: UserDto,
	): Promise<ProjectDetailDto> {
		const { name, lastKnownUpdatedAt, links, servers, ...otherData } = updateProjectDto;

		try {
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
						servers: (servers as unknown as Prisma.JsonArray) ?? undefined,
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

			this.eventEmitter.emit(AuditEvent, {
				actor: updater,
				action: AuditAction.PROJECT_UPDATED,
				targetId: updatedProject.id,
				details: { name: updatedProject.name },
			} satisfies AuditLogEvent);

			return new ProjectDetailDto(updatedProject);
		} catch (error: unknown) {
			this.logger.error({ error }, `Failed to update project ${projectId}.`);

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

		const ownerUserIds = owners?.users?.map((user) => user.id) ?? [];
		const ownerTeamIds = owners?.teams?.map((team) => team.id) ?? [];
		const viewerUserIds = viewers?.users?.map((user) => user.id) ?? [];
		const viewerTeamIds = viewers?.teams?.map((team) => team.id) ?? [];
		const deniedUserIds = deniedUsers?.map((user) => user.id) ?? [];

		const currentUserTeamIds = new Set(currentUser.teams?.map((team) => team.id) ?? []);

		const stillOwner =
			ownerUserIds.includes(currentUser.id) ||
			ownerTeamIds.some((teamId) => currentUserTeamIds.has(teamId));

		if (currentUser.role !== Role.admin && !stillOwner) {
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
					ownerUserIds.length > 0
						? tx.userProjectAccess.createMany({
								data: ownerUserIds.map((userId) => ({
									projectId,
									userId,
									type: AccessType.OWNER,
								})),
							})
						: Promise.resolve();

				const createOwnerTeams =
					ownerTeamIds.length > 0
						? tx.teamProjectAccess.createMany({
								data: ownerTeamIds.map((teamId) => ({
									projectId,
									teamId,
									type: AccessType.OWNER,
								})),
							})
						: Promise.resolve();

				const createViewerUsers =
					viewerUserIds.length > 0
						? tx.userProjectAccess.createMany({
								data: viewerUserIds.map((userId) => ({
									projectId,
									userId,
									type: AccessType.VIEWER,
								})),
							})
						: Promise.resolve();

				const createViewerTeams =
					viewerTeamIds.length > 0
						? tx.teamProjectAccess.createMany({
								data: viewerTeamIds.map((teamId) => ({
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
						deniedUsers: { set: deniedUserIds.map((userId) => ({ id: userId })) },
						updatedById: currentUser.id,
					},
					include: projectDetailInclude,
				});
			});

			this.eventEmitter.emit(AuditEvent, {
				actor: currentUser,
				action: AuditAction.PROJECT_ACCESS_UPDATED,
				targetId: updatedProject.id,
			} satisfies AuditLogEvent);

			return new ProjectDetailDto(updatedProject);
		} catch (error: unknown) {
			if (error instanceof ProjectNotFoundException || error instanceof ForbiddenException) {
				throw error;
			}

			this.logger.error({ error }, `Failed to update access for project ${projectId}.`);

			handlePrismaError(error, {
				[PrismaErrorCode.RecordNotFound]: new ProjectConcurrencyException(),
			});
		}
	}

	async delete(projectId: string, user: UserDto): Promise<void> {
		try {
			await this.prisma.project.delete({ where: { id: projectId } });

			this.eventEmitter.emit(AuditEvent, {
				actor: user,
				action: AuditAction.PROJECT_DELETED,
				targetId: projectId,
			} satisfies AuditLogEvent);
		} catch (error: unknown) {
			this.logger.error({ error }, `Failed to delete project ${projectId}.`);

			handlePrismaError(error, {
				[PrismaErrorCode.RecordNotFound]: new ProjectNotFoundException(projectId),
			});
		}
	}

	async getOpenApiSpec(projectId: string, user: UserDto): Promise<Prisma.JsonValue> {
		try {
			const where = this._createAccessControlWhereClause(user);
			const projectWithDetails = await this.prisma.project.findFirst({
				where: { AND: [{ id: projectId }, where] },
				include: {
					endpoints: {
						select: { path: true, method: true, operation: true },
						orderBy: { path: 'asc' },
					},
					schemaComponents: {
						select: { name: true, schema: true },
						orderBy: { name: 'asc' },
					},
				},
			});

			if (!projectWithDetails) {
				throw new ProjectNotFoundException(projectId);
			}

			return this.specBuilder.build(
				projectWithDetails,
				projectWithDetails.endpoints,
				projectWithDetails.schemaComponents,
			);
		} catch (error: unknown) {
			if (error instanceof ProjectNotFoundException) throw error;

			this.logger.error({ error }, `Failed to get OpenAPI spec for project ${projectId}.`);

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
					if (err.message.toLowerCase().includes('circular')) {
						throw new SpecCircularDependencyException(err.message);
					}

					throw new SpecValidationException(err.message);
				}

				throw new SpecValidationException('An unknown validation error occurred.');
			}

			const lintingIssues = await this.apiLintingService.lintSpec(
				dereferencedSpec as OpenAPIObject,
			);

			if (lintingIssues.length > 0) {
				throw new SpecLintingException(lintingIssues);
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

				return tx.project.update({
					where: { id: projectId },
					data: {
						name: dereferencedSpec.info.title,
						nameNormalized: dereferencedSpec.info.title.toLowerCase(),
						description: dereferencedSpec.info.description,
						servers:
							(dereferencedSpec.servers as unknown as Prisma.JsonArray) ??
							Prisma.JsonNull,
						updatedById: user.id,
					},
					include: projectDetailInclude,
				});
			});

			this.eventEmitter.emit(AuditEvent, {
				actor: user,
				action: AuditAction.PROJECT_SPEC_IMPORTED,
				targetId: updatedProject.id,
			} satisfies AuditLogEvent);

			return new ProjectDetailDto(updatedProject);
		} catch (error: unknown) {
			if (
				error instanceof SpecValidationException ||
				error instanceof SpecLintingException ||
				error instanceof SpecCircularDependencyException
			) {
				throw error;
			}

			this.logger.error({ error }, `Failed to import OpenAPI spec for project ${projectId}.`);

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
