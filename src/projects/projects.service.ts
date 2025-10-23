import { Injectable } from '@nestjs/common';
import { Project } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { UserDto } from 'src/auth/dto/user.dto';
import { ProjectConflictException } from 'src/common/exceptions/project-conflict.exception';
import { ProjectCreationFailure } from 'src/common/exceptions/project-createion-failure.exception';
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
}
