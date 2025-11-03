import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { UserDto } from 'src/auth/dto/user.dto';
import {
	EndpointChangeEvent,
	EndpointEvent,
	EndpointUpdateChangeEvent,
} from 'src/changelog/changelog.events';
import { PrismaErrorCode } from 'src/common/constants/prisma-error-codes.constants';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { EndpointConcurrencyException } from 'src/common/exceptions/endpoint-concurrency.exception';
import { EndpointConflictException } from 'src/common/exceptions/endpoint-conflict.exception';
import { EndpointNotFoundException } from 'src/common/exceptions/endpoint-not-found.exception';
import { ProjectNotFoundException } from 'src/common/exceptions/project-not-found.exception';
import { PaginatedServiceResponse } from 'src/common/interfaces/api-response.interface';
import { handlePrismaError } from 'src/common/utils/prisma-error.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateEndpointDto } from '../endpoints/dto/create-endpoint.dto';
import { EndpointDto } from '../endpoints/dto/endpoint.dto';
import { UpdateEndpointDto } from '../endpoints/dto/update-endpoint.dto';
import { EndpointAppMetadata } from '../spec-reconciliation/spec-reconciliation.types';
import { EndpointSummaryDto } from './dto/endpoint-summary.dto';

@Injectable()
export class EndpointsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly logger: PinoLogger,
		private readonly eventEmitter: EventEmitter2,
	) {
		this.logger.setContext(EndpointsService.name);
	}

	async findAllForProject(
		projectId: string,
		paginationQuery: PaginationQueryDto,
	): Promise<PaginatedServiceResponse<EndpointSummaryDto>> {
		try {
			const { skip, limit, page } = paginationQuery;
			const where = { projectId };

			const [endpoints, total] = await this.prisma.$transaction([
				this.prisma.endpoint.findMany({
					where,
					select: {
						id: true,
						path: true,
						method: true,
						operation: true,
					},
					skip,
					take: limit,
					orderBy: [{ path: 'asc' }, { method: 'asc' }],
				}),
				this.prisma.endpoint.count({ where }),
			]);

			return {
				data: endpoints.map((endpoint) => new EndpointSummaryDto(endpoint)),
				meta: {
					total,
					page,
					limit,
					lastPage: Math.ceil(total / limit) || 1,
				},
			};
		} catch (error: unknown) {
			this.logger.error({ error }, 'Failed to find endpoints for project.');
			throw new InternalServerErrorException('Failed to retrieve endpoints.');
		}
	}

	async findOneById(projectId: string, endpointId: string): Promise<EndpointDto> {
		try {
			const endpoint = await this.prisma.endpoint.findUniqueOrThrow({
				where: { id: endpointId, projectId: projectId },
				include: {
					creator: true,
					updatedBy: true,
				},
			});

			return new EndpointDto(endpoint);
		} catch (error: unknown) {
			this.logger.error(
				{ error },
				`Failed to find endpoint by ID ${endpointId} for project ${projectId}.`,
			);

			handlePrismaError(error, {
				[PrismaErrorCode.RecordNotFound]: new EndpointNotFoundException(endpointId),
			});
		}
	}

	async create(
		projectId: string,
		createEndpointDto: CreateEndpointDto,
		creator: UserDto,
	): Promise<EndpointDto> {
		const { path, method, operation } = createEndpointDto;
		const now = new Date().toISOString();

		const metadata: EndpointAppMetadata = {
			createdBy: creator.username,
			createdAt: now,
			lastEditedBy: creator.username,
			lastEditedAt: now,
		};

		const operationWithMetadata = {
			...operation,
			'x-app-metadata': metadata,
		};

		try {
			const newEndpoint = await this.prisma.endpoint.create({
				data: {
					path,
					method,
					operation: operationWithMetadata as unknown as Prisma.JsonObject,
					projectId,
					creatorId: creator.id,
					updatedById: creator.id,
				},
				include: {
					creator: true,
					updatedBy: true,
				},
			});

			this.eventEmitter.emit(EndpointEvent.CREATED, {
				actor: creator,
				project: { id: projectId },
				endpoint: {
					id: newEndpoint.id,
					method: newEndpoint.method,
					path: newEndpoint.path,
				},
			} satisfies EndpointChangeEvent);

			return new EndpointDto(newEndpoint);
		} catch (error: unknown) {
			this.logger.error({ error }, 'Failed to create endpoint.');

			handlePrismaError(error, {
				[PrismaErrorCode.UniqueConstraintFailed]: new EndpointConflictException(
					method,
					path,
				),
				[PrismaErrorCode.ForeignKeyConstraintFailed]: new ProjectNotFoundException(
					projectId,
				),
			});
		}
	}

	async update(
		projectId: string,
		endpointId: string,
		updateEndpointDto: UpdateEndpointDto,
		updater: UserDto,
	): Promise<EndpointDto> {
		const { path, method, operation, lastKnownUpdatedAt } = updateEndpointDto;
		const now = new Date().toISOString();

		try {
			const existingEndpoint = await this.prisma.endpoint.findUniqueOrThrow({
				where: { id: endpointId, projectId },
				include: { creator: true },
			});

			const existingMetadata = (existingEndpoint.operation as Prisma.JsonObject)?.[
				'x-app-metadata'
			] as EndpointAppMetadata | undefined;

			const newMetadata: EndpointAppMetadata = {
				createdBy: existingMetadata?.createdBy ?? existingEndpoint.creator.username,
				createdAt: existingMetadata?.createdAt ?? existingEndpoint.createdAt.toISOString(),
				lastEditedBy: updater.username,
				lastEditedAt: now,
			};

			const operationWithMetadata = {
				...operation,
				'x-app-metadata': newMetadata,
			};

			const updatedEndpoint = await this.prisma.endpoint.update({
				where: {
					id: endpointId,
					projectId: projectId,
					updatedAt: new Date(lastKnownUpdatedAt),
				},
				data: {
					path,
					method,
					operation: operationWithMetadata as unknown as Prisma.JsonObject,
					updatedById: updater.id,
				},
				include: {
					creator: true,
					updatedBy: true,
				},
			});

			this.eventEmitter.emit(EndpointEvent.UPDATED, {
				actor: updater,
				project: { id: projectId },
				before: existingEndpoint,
				after: updatedEndpoint,
			} satisfies EndpointUpdateChangeEvent);

			return new EndpointDto(updatedEndpoint);
		} catch (error: unknown) {
			this.logger.error({ error }, `Failed to update endpoint ${endpointId}.`);

			handlePrismaError(error, {
				[PrismaErrorCode.RecordNotFound]: new EndpointConcurrencyException(),
				[PrismaErrorCode.UniqueConstraintFailed]: new EndpointConflictException(
					method,
					path,
				),
			});
		}
	}

	async remove(projectId: string, endpointId: string, user: UserDto): Promise<void> {
		try {
			const deletedEndpoint = await this.prisma.endpoint.delete({
				where: {
					id: endpointId,
					projectId: projectId,
				},
			});

			this.eventEmitter.emit(EndpointEvent.DELETED, {
				actor: user,
				project: { id: projectId },
				endpoint: {
					id: deletedEndpoint.id,
					method: deletedEndpoint.method,
					path: deletedEndpoint.path,
				},
			} satisfies EndpointChangeEvent);
		} catch (error: unknown) {
			this.logger.error({ error }, `Failed to delete endpoint ${endpointId}.`);

			handlePrismaError(error, {
				[PrismaErrorCode.RecordNotFound]: new EndpointNotFoundException(endpointId),
			});
		}
	}
}
