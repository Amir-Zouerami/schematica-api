import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma, Project, Role } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { UserDto } from 'src/auth/dto/user.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { ProjectConcurrencyException } from 'src/common/exceptions/project-concurrency.exception';
import { ProjectConflictException } from 'src/common/exceptions/project-conflict.exception';
import { ProjectCreationFailure } from 'src/common/exceptions/project-creation-failure.exception';
import { ProjectNotFoundException } from 'src/common/exceptions/project-not-found.exception';
import { PaginatedServiceResponse } from 'src/common/interfaces/api-response.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectDetailDto } from './dto/project-detail.dto';
import { ProjectSummaryDto } from './dto/project-summary.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly logger: PinoLogger,
	) {
		this.logger.setContext(ProjectsService.name);
	}

	async create(
		createProjectDto: CreateProjectDto,
		creator: UserDto,
	): Promise<Project> {
		const { name, description, serverUrl, links } = createProjectDto;

		const initialOpenApiSpec = {
			openapi: '3.0.0',
			info: {
				title: name,
				version: '1.0.0',
				description: description || `API documentation for ${name}`,
			},
			servers: serverUrl ? [{ url: serverUrl }] : [],
			paths: {},
			components: {
				schemas: {},
				parameters: {},
				responses: {},
				requestBodies: {},
			},
		};

		try {
			return await this.prisma.project.create({
				data: {
					name,
					nameNormalized: name.toLowerCase(),
					description,
					serverUrl,
					openApiSpec: initialOpenApiSpec,
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
					userAccesses: {
						create: {
							userId: creator.id,
							type: 'OWNER',
						},
					},
				},
			});
		} catch (error) {
			this._handlePrismaError(error, {
				P2002: new ProjectConflictException(name),
				default: new ProjectCreationFailure(name),
			});
		}
	}

	async findAllForUser(
		user: UserDto,
		paginationQuery: PaginationQueryDto,
	): Promise<PaginatedServiceResponse<ProjectSummaryDto>> {
		try {
			const { skip, limit } = paginationQuery;
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
					orderBy: { createdAt: 'desc' },
				}),
				this.prisma.project.count({ where }),
			]);

			return {
				meta: {
					page: paginationQuery.page,
					limit,
					lastPage: Math.ceil(total / limit),
					total,
				},
				data: projects,
			};
		} catch (error) {
			this._handlePrismaError(error);
		}
	}

	async findOneByIdForUser(
		projectId: string,
		user: UserDto,
	): Promise<ProjectDetailDto> {
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
				where: { id: projectId, ...where },
			});

			if (!project) {
				throw new ProjectNotFoundException(projectId);
			}
			return project;
		} catch (error) {
			this._handlePrismaError(error);
		}
	}

	async findSpecByIdForUser(
		projectId: string,
		user: UserDto,
	): Promise<{ openApiSpec: Prisma.JsonValue }> {
		try {
			const where = this._createAccessControlWhereClause(user);
			const project = await this.prisma.project.findFirst({
				select: { openApiSpec: true },
				where: { id: projectId, ...where },
			});

			if (!project) {
				throw new ProjectNotFoundException(projectId);
			}
			return project;
		} catch (error) {
			this._handlePrismaError(error);
		}
	}

	async update(
		projectId: string,
		updateProjectDto: UpdateProjectDto,
		updater: UserDto,
	): Promise<ProjectDetailDto> {
		const { name, lastKnownUpdatedAt, links, ...otherData } =
			updateProjectDto;

		try {
			return await this.prisma.$transaction(async (tx) => {
				await tx.projectLink.deleteMany({ where: { projectId } });

				return tx.project.update({
					where: {
						id: projectId,
						updatedAt: new Date(lastKnownUpdatedAt),
					},
					data: {
						name,
						nameNormalized: name ? name.toLowerCase() : undefined,
						...otherData,
						updatedById: updater.id,
						links: links
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
			this._handlePrismaError(error, {
				P2025: new ProjectConcurrencyException(),
				P2002: new ProjectConflictException(name),
			});
		}
	}

	async delete(projectId: string): Promise<void> {
		try {
			await this.prisma.project.delete({
				where: { id: projectId },
			});
		} catch (error) {
			this._handlePrismaError(error, {
				P2025: new ProjectNotFoundException(projectId),
			});
		}
	}

	private _createAccessControlWhereClause(
		user: UserDto,
	): Prisma.ProjectWhereInput {
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
		exceptions?: { P2002?: Error; P2025?: Error; default?: Error },
	): never {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === 'P2002' && exceptions?.P2002) {
				throw exceptions.P2002;
			}
			if (error.code === 'P2025' && exceptions?.P2025) {
				throw exceptions.P2025;
			}
		}

		if (exceptions?.default) {
			throw exceptions.default;
		}

		this.logger.error(
			{
				error:
					error instanceof Error
						? error.stack
						: JSON.stringify(error),
			},
			'An unexpected error occurred in ProjectsService.',
		);

		throw new InternalServerErrorException('An unexpected error occurred.');
	}
}
