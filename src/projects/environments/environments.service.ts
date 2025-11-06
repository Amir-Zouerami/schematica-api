import {
	ConflictException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PinoLogger } from 'nestjs-pino';
import { AuditAction, AuditEvent, AuditLogEvent } from 'src/audit/audit.events';
import { UserDto } from 'src/auth/dto/user.dto';
import { PrismaErrorCode } from 'src/common/constants/prisma-error-codes.constants';
import { handlePrismaError } from 'src/common/utils/prisma-error.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { EnvironmentDto } from './dto/environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';

@Injectable()
export class EnvironmentsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly logger: PinoLogger,
		private readonly eventEmitter: EventEmitter2,
	) {
		this.logger.setContext(EnvironmentsService.name);
	}

	async create(
		projectId: string,
		createEnvironmentDto: CreateEnvironmentDto,
		actor: UserDto,
	): Promise<EnvironmentDto> {
		try {
			const newEnvironment = await this.prisma.environment.create({
				data: {
					...createEnvironmentDto,
					projectId,
				},
			});

			this.eventEmitter.emit(AuditEvent, {
				actor,
				action: AuditAction.ENVIRONMENT_CREATED,
				targetId: newEnvironment.id,
				details: { name: newEnvironment.name, project: projectId },
			} satisfies AuditLogEvent);

			return new EnvironmentDto(newEnvironment);
		} catch (error: unknown) {
			this.logger.error({ error }, 'Failed to create environment.');
			handlePrismaError(error, {
				[PrismaErrorCode.UniqueConstraintFailed]: new ConflictException(
					`An environment with the name '${createEnvironmentDto.name}' already exists in this project.`,
				),
			});
		}
	}

	async findAllForProject(projectId: string): Promise<EnvironmentDto[]> {
		try {
			const environments = await this.prisma.environment.findMany({
				where: { projectId },
				orderBy: { name: 'asc' },
			});

			return environments.map((env) => new EnvironmentDto(env));
		} catch (error: unknown) {
			this.logger.error({ error, projectId }, 'Failed to find environments for project.');
			throw new InternalServerErrorException('Failed to retrieve environments.');
		}
	}

	async update(
		projectId: string,
		environmentId: string,
		updateEnvironmentDto: UpdateEnvironmentDto,
		actor: UserDto,
	): Promise<EnvironmentDto> {
		try {
			const result = await this.prisma.environment.updateMany({
				where: { id: environmentId, projectId: projectId },
				data: updateEnvironmentDto,
			});

			if (result.count === 0) {
				throw new NotFoundException(
					`Environment with ID '${environmentId}' not found in this project.`,
				);
			}

			const updatedEnvironment = await this.prisma.environment.findUniqueOrThrow({
				where: { id: environmentId },
			});

			this.eventEmitter.emit(AuditEvent, {
				actor,
				action: AuditAction.ENVIRONMENT_UPDATED,
				targetId: updatedEnvironment.id,
				details: { name: updatedEnvironment.name },
			} satisfies AuditLogEvent);

			return new EnvironmentDto(updatedEnvironment);
		} catch (error: unknown) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			this.logger.error({ error }, `Failed to update environment ${environmentId}.`);
			handlePrismaError(error, {
				[PrismaErrorCode.UniqueConstraintFailed]: new ConflictException(
					'An environment with this name already exists in this project.',
				),
			});
		}
	}

	async remove(projectId: string, environmentId: string, actor: UserDto): Promise<void> {
		try {
			const result = await this.prisma.environment.deleteMany({
				where: { id: environmentId, projectId: projectId },
			});

			if (result.count === 0) {
				throw new NotFoundException(
					`Environment with ID '${environmentId}' not found in this project.`,
				);
			}

			this.eventEmitter.emit(AuditEvent, {
				actor,
				action: AuditAction.ENVIRONMENT_DELETED,
				targetId: environmentId,
			} satisfies AuditLogEvent);
		} catch (error: unknown) {
			if (error instanceof NotFoundException) {
				throw error;
			}

			this.logger.error({ error }, `Failed to delete environment ${environmentId}.`);
			throw new InternalServerErrorException('Failed to delete environment.');
		}
	}
}
