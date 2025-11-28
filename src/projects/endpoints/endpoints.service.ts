import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	InternalServerErrorException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type {
	OpenAPIObject,
	OperationObject,
	PathItemObject,
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { EndpointStatus, Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { ApiLintingService } from 'src/api-linting/api-linting.service';
import { AuditAction, AuditEvent, AuditLogEvent } from 'src/audit/audit.events';
import { UserDto } from 'src/auth/dto/user.dto';
import {
	EndpointChangeEvent,
	EndpointEvent,
	EndpointStatusChangeEvent,
	EndpointUpdateChangeEvent,
} from 'src/changelog/changelog.events';
import { VALID_HTTP_METHODS } from 'src/common/constants/http.constants';
import { PrismaErrorCode } from 'src/common/constants/prisma-error-codes.constants';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { EndpointConcurrencyException } from 'src/common/exceptions/endpoint-concurrency.exception';
import { EndpointConflictException } from 'src/common/exceptions/endpoint-conflict.exception';
import { EndpointNotFoundException } from 'src/common/exceptions/endpoint-not-found.exception';
import { EndpointStatusConcurrencyException } from 'src/common/exceptions/endpoint-status-concurrency.exception';
import { ProjectNotFoundException } from 'src/common/exceptions/project-not-found.exception';
import { SpecLintingException } from 'src/common/exceptions/spec-linting.exception';
import { PaginatedServiceResponse } from 'src/common/interfaces/api-response.interface';
import { handlePrismaError } from 'src/common/utils/prisma-error.util';
import {
	EndpointLifecycleEvent,
	EndpointReviewRequestedEvent,
} from 'src/notifications/notifications.events';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateEndpointDto } from '../endpoints/dto/create-endpoint.dto';
import { EndpointDto } from '../endpoints/dto/endpoint.dto';
import { UpdateEndpointDto } from '../endpoints/dto/update-endpoint.dto';
import { EndpointAppMetadata } from '../spec-reconciliation/spec-reconciliation.types';
import { EndpointSummaryDto } from './dto/endpoint-summary.dto';
import { UpdateEndpointStatusDto } from './dto/update-endpoint-status.dto';

@Injectable()
export class EndpointsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly logger: PinoLogger,
		private readonly eventEmitter: EventEmitter2,
		private readonly apiLintingService: ApiLintingService,
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
						status: true,
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
		const { path, method, operation, status } = createEndpointDto;
		const projectSchemas = await this.getProjectSchemas(projectId);
		await this.lintOperation(operation as OperationObject, path, method, projectSchemas);

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
					status,
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
		const { path, method, operation, lastKnownUpdatedAt, status } = updateEndpointDto;
		const projectSchemas = await this.getProjectSchemas(projectId);
		await this.lintOperation(operation as OperationObject, path, method, projectSchemas);

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
					status,
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

	async updateStatus(
		projectId: string,
		endpointId: string,
		updateEndpointStatusDto: UpdateEndpointStatusDto,
		user: UserDto,
	): Promise<EndpointDto> {
		const { status: newStatus } = updateEndpointStatusDto;

		try {
			const endpoint = await this.prisma.endpoint.findUniqueOrThrow({
				where: { id: endpointId, projectId },
				include: { project: true },
			});

			const currentStatus = endpoint.status;

			if (currentStatus === newStatus) {
				return new EndpointDto({
					...endpoint,
					creator: await this.fetchUser(endpoint.creatorId),
					updatedBy: await this.fetchUser(endpoint.updatedById),
				});
			}

			const updatedEndpoint = await this.prisma.$transaction(async (tx) => {
				const result = await tx.endpoint.updateMany({
					where: { id: endpointId, status: currentStatus },
					data: { status: newStatus, updatedById: user.id },
				});

				if (result.count === 0) {
					throw new EndpointStatusConcurrencyException();
				}

				return tx.endpoint.findUniqueOrThrow({
					where: { id: endpointId },
					include: { creator: true, updatedBy: true },
				});
			});

			this.eventEmitter.emit(AuditEvent, {
				actor: user,
				action: AuditAction.ENDPOINT_STATUS_UPDATED,
				targetId: endpoint.id,
				details: {
					path: endpoint.path,
					method: endpoint.method,
					from: currentStatus,
					to: newStatus,
				},
			} satisfies AuditLogEvent);

			this.eventEmitter.emit(EndpointEvent.STATUS_UPDATED, {
				actor: user,
				project: { id: projectId },
				endpoint: {
					id: endpoint.id,
					method: endpoint.method,
					path: endpoint.path,
				},
				fromStatus: currentStatus,
				toStatus: newStatus,
			} satisfies EndpointStatusChangeEvent);

			if (newStatus === EndpointStatus.IN_REVIEW) {
				this.eventEmitter.emit(EndpointLifecycleEvent.REVIEW_REQUESTED, {
					actor: user,
					project: endpoint.project,
					endpoint: endpoint,
				} satisfies EndpointReviewRequestedEvent);
			}

			return new EndpointDto(updatedEndpoint);
		} catch (error: unknown) {
			if (
				error instanceof BadRequestException ||
				error instanceof ForbiddenException ||
				error instanceof EndpointNotFoundException ||
				error instanceof EndpointStatusConcurrencyException
			) {
				throw error;
			}

			this.logger.error({ error }, `Failed to update status for endpoint ${endpointId}.`);
			handlePrismaError(error, {
				[PrismaErrorCode.RecordNotFound]: new EndpointNotFoundException(endpointId),
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

	// --- HELPER METHODS ---

	private async lintOperation(
		operation: OperationObject,
		path: string,
		method: string,
		schemas: Record<string, any>,
	): Promise<void> {
		type HttpMethod = keyof Omit<
			PathItemObject,
			'summary' | 'description' | 'servers' | 'parameters'
		>;

		const normalizedMethod = method.toLowerCase();
		if (!VALID_HTTP_METHODS.has(normalizedMethod)) {
			throw new BadRequestException(`Invalid HTTP method: ${method}`);
		}

		const pathItem: PathItemObject = {
			[normalizedMethod as HttpMethod]: operation,
		};

		const minimalSpec: OpenAPIObject = {
			openapi: '3.0.0',
			info: {
				title: 'Validation Spec',
				version: '1.0.0',
				description: 'A temporary spec for single-endpoint validation.',
			},
			paths: {
				[path]: pathItem,
			},
			components: {
				schemas: schemas,
			},
		};

		const issues = await this.apiLintingService.lintSpec(minimalSpec);
		if (issues.length > 0) {
			throw new SpecLintingException(issues);
		}
	}

	private async getProjectSchemas(projectId: string): Promise<Record<string, any>> {
		const components = await this.prisma.schemaComponent.findMany({
			where: { projectId },
			select: { name: true, schema: true },
		});

		const schemas: Record<string, any> = {};
		for (const c of components) {
			schemas[c.name] = c.schema;
		}
		return schemas;
	}

	private fetchUser(userId: string) {
		return this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
	}
}
