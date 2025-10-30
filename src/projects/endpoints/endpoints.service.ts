import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { UserDto } from 'src/auth/dto/user.dto';
import { PrismaErrorCode } from 'src/common/constants/prisma-error-codes.constants';
import { EndpointConcurrencyException } from 'src/common/exceptions/endpoint-concurrency.exception';
import { EndpointConflictException } from 'src/common/exceptions/endpoint-conflict.exception';
import { EndpointNotFoundException } from 'src/common/exceptions/endpoint-not-found.exception';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateEndpointDto } from '../endpoints/dto/create-endpoint.dto';
import { EndpointDto } from '../endpoints/dto/endpoint.dto';
import { UpdateEndpointDto } from '../endpoints/dto/update-endpoint.dto';

@Injectable()
export class EndpointsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly logger: PinoLogger,
	) {
		this.logger.setContext(EndpointsService.name);
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
				// eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
				error.code === PrismaErrorCode.UniqueConstraintFailed
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
				// eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
				if (error.code === PrismaErrorCode.RecordNotFound) {
					throw new EndpointConcurrencyException();
				}

				// eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
				if (error.code === PrismaErrorCode.UniqueConstraintFailed) {
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
				// This rule is overly aggressive for comparing a known string from a Prisma error to a string enum.
				// eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
				error.code === PrismaErrorCode.RecordNotFound
			) {
				throw new EndpointNotFoundException(endpointId);
			}
			this.logger.error({ error: error as unknown }, 'Failed to delete endpoint.');
			throw new InternalServerErrorException('Failed to delete endpoint.');
		}
	}
}
