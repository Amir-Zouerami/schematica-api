import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { UserDto } from 'src/auth/dto/user.dto';
import { PrismaErrorCode } from 'src/common/constants/prisma-error-codes.constants';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { EndpointConcurrencyException } from 'src/common/exceptions/endpoint-concurrency.exception';
import { EndpointConflictException } from 'src/common/exceptions/endpoint-conflict.exception';
import { EndpointNotFoundException } from 'src/common/exceptions/endpoint-not-found.exception';
import { PaginatedServiceResponse } from 'src/common/interfaces/api-response.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateEndpointDto } from '../endpoints/dto/create-endpoint.dto';
import { EndpointDto } from '../endpoints/dto/endpoint.dto';
import { UpdateEndpointDto } from '../endpoints/dto/update-endpoint.dto';
import { EndpointSummaryDto } from './dto/endpoint-summary.dto';

@Injectable()
export class EndpointsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly logger: PinoLogger,
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

			const summaryData = endpoints.map((endpoint): EndpointSummaryDto => {
				const operation = endpoint.operation as Record<string, unknown> | null;

				const summary =
					typeof operation?.summary === 'string' ? operation.summary : undefined;

				const tags = Array.isArray(operation?.tags)
					? (operation.tags as string[])
					: undefined;

				return {
					id: endpoint.id,
					path: endpoint.path,
					method: endpoint.method,
					summary,
					tags,
				};
			});

			return {
				data: summaryData,
				meta: {
					total,
					page,
					limit,
					lastPage: Math.ceil(total / limit) || 1,
				},
			};
		} catch (error) {
			this.logger.error({ error: error as unknown }, 'Failed to find endpoints for project.');
			throw new InternalServerErrorException('Failed to retrieve endpoints.');
		}
	}

	async findOneById(endpointId: string): Promise<EndpointDto> {
		try {
			const endpoint = await this.prisma.endpoint.findUniqueOrThrow({
				where: { id: endpointId },
				select: {
					id: true,
					path: true,
					method: true,
					operation: true,
					createdAt: true,
					updatedAt: true,
					creator: { select: { id: true, username: true, profileImage: true } },
					updatedBy: { select: { id: true, username: true, profileImage: true } },
				},
			});

			return endpoint as EndpointDto;
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				(error.code as PrismaErrorCode) === PrismaErrorCode.RecordNotFound
			) {
				throw new EndpointNotFoundException(endpointId);
			}

			this.logger.error({ error: error as unknown }, 'Failed to find endpoint by ID.');
			throw new InternalServerErrorException('Failed to retrieve endpoint.');
		}
	}

	async create(
		projectId: string,
		createEndpointDto: CreateEndpointDto,
		creator: UserDto,
	): Promise<EndpointDto> {
		const { path, method, operation } = createEndpointDto;

		try {
			const newEndpoint = await this.prisma.endpoint.create({
				data: {
					path,
					method,
					operation: operation as unknown as Prisma.JsonObject,
					projectId,
					creatorId: creator.id,
					updatedById: creator.id,
				},
				select: {
					id: true,
					path: true,
					method: true,
					operation: true,
					createdAt: true,
					updatedAt: true,
					creator: { select: { id: true, username: true, profileImage: true } },
					updatedBy: { select: { id: true, username: true, profileImage: true } },
				},
			});

			return newEndpoint;
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				(error.code as PrismaErrorCode) === PrismaErrorCode.UniqueConstraintFailed
			) {
				throw new EndpointConflictException(method, path);
			}

			this.logger.error({ error: error as unknown }, 'Failed to create endpoint.');

			throw new InternalServerErrorException('Failed to create endpoint.');
		}
	}

	async update(
		endpointId: string,
		updateEndpointDto: UpdateEndpointDto,
		updater: UserDto,
	): Promise<EndpointDto> {
		const { path, method, operation, lastKnownUpdatedAt } = updateEndpointDto;

		try {
			const updatedEndpoint = await this.prisma.endpoint.update({
				where: {
					id: endpointId,
					updatedAt: new Date(lastKnownUpdatedAt),
				},
				data: {
					path,
					method,
					operation: operation as unknown as Prisma.JsonObject,
					updatedById: updater.id,
				},
				select: {
					id: true,
					path: true,
					method: true,
					operation: true,
					createdAt: true,
					updatedAt: true,
					creator: { select: { id: true, username: true, profileImage: true } },
					updatedBy: { select: { id: true, username: true, profileImage: true } },
				},
			});

			return updatedEndpoint as EndpointDto;
		} catch (error) {
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				if ((error.code as PrismaErrorCode) === PrismaErrorCode.RecordNotFound) {
					throw new EndpointConcurrencyException();
				}

				if ((error.code as PrismaErrorCode) === PrismaErrorCode.UniqueConstraintFailed) {
					throw new EndpointConflictException(method, path);
				}
			}
			this.logger.error({ error: error as unknown }, 'Failed to update endpoint.');
			throw new InternalServerErrorException('Failed to update endpoint.');
		}
	}

	async remove(endpointId: string): Promise<void> {
		try {
			await this.prisma.endpoint.delete({
				where: { id: endpointId },
			});
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				(error.code as PrismaErrorCode) === PrismaErrorCode.RecordNotFound
			) {
				throw new EndpointNotFoundException(endpointId);
			}
			this.logger.error({ error: error as unknown }, 'Failed to delete endpoint.');
			throw new InternalServerErrorException('Failed to delete endpoint.');
		}
	}
}
