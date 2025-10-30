import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { UserDto } from 'src/auth/dto/user.dto';
import { PrismaErrorCode } from 'src/common/constants/prisma-error-codes.constants';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { ProjectConcurrencyException } from 'src/common/exceptions/project-concurrency.exception';
import { ProjectConflictException } from 'src/common/exceptions/project-conflict.exception';
import { ProjectCreationFailure } from 'src/common/exceptions/project-creation-failure.exception';
import { ProjectNotFoundException } from 'src/common/exceptions/project-not-found.exception';
import { PaginatedServiceResponse } from 'src/common/interfaces/api-response.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { SanitizedUserDto } from 'src/users/dto/sanitized-user.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectDetailDto } from './dto/project-detail.dto';
import { ProjectSummaryDto } from './dto/project-summary.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { OpenApiSpecBuilder } from './spec-builder/openapi-spec.builder';

@Injectable()
export class ProjectsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly logger: PinoLogger,
		private readonly specBuilder: OpenApiSpecBuilder,
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
					select: {
						id: true,
						name: true,
						description: true,
						serverUrl: true,
						createdAt: true,
						updatedAt: true,
						creator: { select: { id: true, username: true, profileImage: true } },
						updatedBy: { select: { id: true, username: true, profileImage: true } },
						links: true,
					},
				});

				return newProjectDetail as ProjectDetailDto;
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
					select: {
						id: true,
						name: true,
						description: true,
						createdAt: true,
						updatedAt: true,
						creator: {
							select: {
								id: true,
								username: true,
								profileImage: true,
							},
						},
						updatedBy: {
							select: {
								id: true,
								username: true,
								profileImage: true,
							},
						},
					},
					where,
					skip,
					take: limit,
					orderBy: { updatedAt: 'desc' },
				}),
				this.prisma.project.count({ where }),
			]);

			return {
				data: projects.map((p) => ({
					...p,
					creator: p.creator as SanitizedUserDto,
					updatedBy: p.updatedBy as SanitizedUserDto,
				})),
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
				select: {
					id: true,
					name: true,
					description: true,
					serverUrl: true,
					createdAt: true,
					updatedAt: true,
					creator: {
						select: {
							id: true,
							username: true,
							profileImage: true,
						},
					},
					updatedBy: {
						select: {
							id: true,
							username: true,
							profileImage: true,
						},
					},
					links: true,
				},
				where: { AND: [{ id: projectId }, where] },
			});

			if (!project) {
				throw new ProjectNotFoundException(projectId);
			}

			return project as ProjectDetailDto;
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

			return await this.prisma.$transaction(async (tx) => {
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
					select: {
						id: true,
						name: true,
						description: true,
						serverUrl: true,
						createdAt: true,
						updatedAt: true,
						creator: {
							select: {
								id: true,
								username: true,
								profileImage: true,
							},
						},
						updatedBy: {
							select: {
								id: true,
								username: true,
								profileImage: true,
							},
						},
						links: true,
					},
				});
			});
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
