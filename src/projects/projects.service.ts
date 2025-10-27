import { Injectable } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { Prisma, Project, Role } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { UserDto } from 'src/auth/dto/user.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { ProjectConflictException } from 'src/common/exceptions/project-conflict.exception';
import { ProjectCreationFailure } from 'src/common/exceptions/project-creation-failure.exception';
import { PaginatedServiceResponse } from 'src/common/interfaces/api-response.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly logger: PinoLogger,
	) {
		this.logger.setContext(ProjectsService.name);
	}

	@ApiOkResponse({ description: 'the details of the newly created project' })
	async create(
		createProjectDto: CreateProjectDto,
		creator: UserDto,
	): Promise<Project> {
		const { name, description, serverUrl, links } = createProjectDto;

		const alreadyExistingProject = await this.prisma.project.findUnique({
			where: { name },
		});

		if (alreadyExistingProject) {
			throw new ProjectConflictException(name);
		}

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
			const project = await this.prisma.project.create({
				data: {
					name,
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

			return project;
		} catch (error) {
			const logObject = {
				message: `Failed to create project "${name}" for user ${creator.username}.`,
				projectData: { name, creator: creator.username },
			};

			if (error instanceof Error) {
				this.logger.error(
					{ ...logObject, stack: error.stack },
					error.message,
				);
			} else {
				this.logger.error(
					{ ...logObject, caughtValue: error as unknown },
					'An unknown error occurred during project creation.',
				);
			}

			throw new ProjectCreationFailure(name);
		}
	}

	/**
	 * Finds all projects a given user is allowed to see.
	 *
	 * - Admins can see all projects.
	 * - Other users can see projects based on ownership, allowed access,
	 *   or team membership, excluding any projects they are explicitly denied from.
	 */
	async findAllForUser(
		user: UserDto,
		paginationQuery: PaginationQueryDto,
	): Promise<PaginatedServiceResponse<Omit<Project, 'openApiSpec'>>> {
		const { skip, limit } = paginationQuery;

		let where: Prisma.ProjectWhereInput = {};

		if (user.role !== Role.admin) {
			where = {
				deniedUsers: { none: { id: user.id } },
				OR: [
					{ userAccesses: { some: { userId: user.id } } },
					{
						teamAccesses: {
							some: {
								teamId: {
									in: user.teams?.map((t) => t.id),
								},
							},
						},
					},
				],
			};
		}

		const [projects, total] = await this.prisma.$transaction([
			this.prisma.project.findMany({
				select: {
					id: true,
					name: true,
					description: true,
					serverUrl: true,
					createdAt: true,
					updatedAt: true,
					creatorId: true,
					updatedById: true,
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
	}
}
