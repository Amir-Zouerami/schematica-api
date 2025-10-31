import SwaggerParser from '@apidevtools/swagger-parser';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
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
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectDetailDto } from './dto/project-detail.dto';
import { ProjectSummaryDto } from './dto/project-summary.dto';
import { UpdateOpenApiSpecDto } from './dto/update-openapi-spec.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { OpenApiSpecBuilder } from './spec-builder/openapi-spec.builder';
import { SpecReconciliationService } from './spec-reconciliation/spec-reconciliation.service';

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
			return await this.prisma.$transaction(async (tx) => {
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
						type: 'OWNER',
					},
				});

				const newProjectDetail = await tx.project.findUniqueOrThrow({
					where: { id: project.id },
					include: {
						creator: true,
						updatedBy: true,
						links: true,
					},
				});

				return new ProjectDetailDto(newProjectDetail);
			});
		} catch (error) {
			this._handlePrismaError(error, {
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
			this._handlePrismaError(error);
		}
	}

	async findOneByIdForUser(projectId: string, user: UserDto): Promise<ProjectDetailDto> {
		try {
			const where = this._createAccessControlWhereClause(user);
			const project = await this.prisma.project.findFirst({
				include: {
					creator: true,
					updatedBy: true,
					links: true,
				},
				where: { AND: [{ id: projectId }, where] },
			});

			if (!project) {
				throw new ProjectNotFoundException(projectId);
			}

			return new ProjectDetailDto(project);
		} catch (error) {
			if (error instanceof ProjectNotFoundException) throw error;
			this._handlePrismaError(error);
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
					include: {
						creator: true,
						updatedBy: true,
						links: true,
					},
				});
			});

			return new ProjectDetailDto(updatedProject);
		} catch (error) {
			if (error instanceof ProjectNotFoundException) throw error;
			this._handlePrismaError(error, {
				[PrismaErrorCode.RecordNotFound]: new ProjectConcurrencyException(),
				[PrismaErrorCode.UniqueConstraintFailed]: new ProjectConflictException(
					updateProjectDto.name,
				),
			});
		}
	}

	async delete(projectId: string): Promise<void> {
		try {
			await this.prisma.project.delete({ where: { id: projectId } });
		} catch (error) {
			this._handlePrismaError(error, {
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
			this._handlePrismaError(error);
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

			return await this.prisma.$transaction(async (tx) => {
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
					await tx.note.deleteMany({ where: { endpointId: { in: toDeleteIds } } });
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
				const updatedProject = await tx.project.update({
					where: { id: projectId },
					data: {
						name: dereferencedSpec.info.title,
						nameNormalized: dereferencedSpec.info.title.toLowerCase(),
						description: dereferencedSpec.info.description,
						serverUrl,
						updatedById: user.id,
					},
					include: {
						creator: true,
						updatedBy: true,
						links: true,
					},
				});

				return new ProjectDetailDto(updatedProject);
			});
		} catch (error) {
			if (error instanceof SpecValidationException) {
				throw error;
			}

			this._handlePrismaError(error, {
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

	private _handlePrismaError(
		error: unknown,
		exceptions?: { [key in PrismaErrorCode]?: Error } & { default?: Error },
	): never {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			const specificError = exceptions?.[error.code as PrismaErrorCode];

			if (specificError) {
				throw specificError;
			}
		}

		if (exceptions?.default) {
			throw exceptions.default;
		}

		this.logger.error(
			{ error: error },
			'An unexpected database error occurred in ProjectsService.',
		);
		throw new InternalServerErrorException('An unexpected error occurred.');
	}
}
