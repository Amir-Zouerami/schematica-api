import {
	ConflictException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { AuditAction, AuditEvent, AuditLogEvent } from 'src/audit/audit.events';
import { UserDto } from 'src/auth/dto/user.dto';
import { PrismaErrorCode } from 'src/common/constants/prisma-error-codes.constants';
import { handlePrismaError } from 'src/common/utils/prisma-error.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSchemaComponentDto } from './dto/create-schema-component.dto';
import { SchemaComponentDto } from './dto/schema-component.dto';
import { UpdateSchemaComponentDto } from './dto/update-schema-component.dto';

@Injectable()
export class SchemaComponentsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly logger: PinoLogger,
		private readonly eventEmitter: EventEmitter2,
	) {
		this.logger.setContext(SchemaComponentsService.name);
	}

	async create(
		projectId: string,
		createDto: CreateSchemaComponentDto,
		actor: UserDto,
	): Promise<SchemaComponentDto> {
		try {
			const { name, description, schema } = createDto;

			const newComponent = await this.prisma.schemaComponent.create({
				data: {
					name,
					description,
					schema: schema as unknown as Prisma.JsonObject,
					projectId,
					creatorId: actor.id,
					updatedById: actor.id,
				},
			});

			this.eventEmitter.emit(AuditEvent, {
				actor,
				action: AuditAction.SCHEMA_COMPONENT_CREATED,
				targetId: newComponent.id,
				details: { name: newComponent.name, project: projectId },
			} satisfies AuditLogEvent);

			return new SchemaComponentDto(newComponent);
		} catch (error: unknown) {
			this.logger.error({ error }, 'Failed to create schema component.');
			handlePrismaError(error, {
				[PrismaErrorCode.UniqueConstraintFailed]: new ConflictException(
					`A schema component with the name '${createDto.name}' already exists in this project.`,
				),
			});
		}
	}

	async findAllForProject(projectId: string): Promise<SchemaComponentDto[]> {
		try {
			const components = await this.prisma.schemaComponent.findMany({
				where: { projectId },
				orderBy: { name: 'asc' },
			});

			return components.map((c) => new SchemaComponentDto(c));
		} catch (error: unknown) {
			this.logger.error(
				{ error, projectId },
				'Failed to find schema components for project.',
			);

			throw new InternalServerErrorException('Failed to retrieve schema components.');
		}
	}

	async findOneByName(projectId: string, name: string): Promise<SchemaComponentDto> {
		try {
			const component = await this.prisma.schemaComponent.findUniqueOrThrow({
				where: { projectId_name: { projectId, name } },
			});

			return new SchemaComponentDto(component);
		} catch (error: unknown) {
			this.logger.error(
				{ error, projectId, name },
				'Failed to find schema component by name.',
			);

			handlePrismaError(error, {
				[PrismaErrorCode.RecordNotFound]: new NotFoundException(
					`Schema component with name '${name}' not found in this project.`,
				),
			});
		}
	}

	async update(
		projectId: string,
		name: string,
		updateDto: UpdateSchemaComponentDto,
		actor: UserDto,
	): Promise<SchemaComponentDto> {
		try {
			const { schema, ...restOfDto } = updateDto;

			const updatedComponent = await this.prisma.schemaComponent.update({
				where: { projectId_name: { projectId, name } },
				data: {
					...restOfDto,
					schema: schema ? (schema as unknown as Prisma.JsonObject) : undefined,
					updatedById: actor.id,
				},
			});

			this.eventEmitter.emit(AuditEvent, {
				actor,
				action: AuditAction.SCHEMA_COMPONENT_UPDATED,
				targetId: updatedComponent.id,
				details: { name: updatedComponent.name },
			} satisfies AuditLogEvent);

			return new SchemaComponentDto(updatedComponent);
		} catch (error: unknown) {
			this.logger.error({ error }, `Failed to update schema component '${name}'.`);

			handlePrismaError(error, {
				[PrismaErrorCode.RecordNotFound]: new NotFoundException(
					`Schema component with name '${name}' not found in this project.`,
				),
				[PrismaErrorCode.UniqueConstraintFailed]: new ConflictException(
					`A schema component with the name '${updateDto.name}' already exists in this project.`,
				),
			});
		}
	}

	async remove(projectId: string, name: string, actor: UserDto): Promise<void> {
		try {
			const deleted = await this.prisma.schemaComponent.delete({
				where: { projectId_name: { projectId, name } },
			});

			this.eventEmitter.emit(AuditEvent, {
				actor,
				action: AuditAction.SCHEMA_COMPONENT_DELETED,
				targetId: deleted.id,
				details: { name },
			} satisfies AuditLogEvent);
		} catch (error: unknown) {
			this.logger.error({ error }, `Failed to delete schema component '${name}'.`);

			handlePrismaError(error, {
				[PrismaErrorCode.RecordNotFound]: new NotFoundException(
					`Schema component with name '${name}' not found in this project.`,
				),
			});
		}
	}
}
