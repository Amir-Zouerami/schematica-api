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
import { EncryptionService } from 'src/encryption/encryption.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSecretDto } from './dto/create-secret.dto';
import { SecretDto } from './dto/secret.dto';
import { UpdateSecretDto } from './dto/update-secret.dto';

@Injectable()
export class SecretsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly logger: PinoLogger,
		private readonly eventEmitter: EventEmitter2,
		private readonly encryptionService: EncryptionService,
	) {
		this.logger.setContext(SecretsService.name);
	}

	async create(
		environmentId: string,
		createSecretDto: CreateSecretDto,
		actor: UserDto,
	): Promise<SecretDto> {
		const { key, value, description } = createSecretDto;
		const encryptedValue = this.encryptionService.encrypt(value);

		try {
			const newSecret = await this.prisma.secret.create({
				data: {
					key,
					value: encryptedValue,
					description,
					environmentId,
				},
			});

			this.eventEmitter.emit(AuditEvent, {
				actor,
				action: AuditAction.SECRET_CREATED,
				targetId: newSecret.id.toString(),
				details: { key: newSecret.key, environment: environmentId },
			} satisfies AuditLogEvent);

			return new SecretDto(newSecret, value);
		} catch (error: unknown) {
			this.logger.error({ error }, 'Failed to create secret.');
			handlePrismaError(error, {
				[PrismaErrorCode.UniqueConstraintFailed]: new ConflictException(
					`A secret with the key '${key}' already exists in this environment.`,
				),
			});
		}
	}

	async findAllForEnvironment(environmentId: string): Promise<SecretDto[]> {
		try {
			const secrets = await this.prisma.secret.findMany({
				where: { environmentId },
				orderBy: { key: 'asc' },
			});

			return secrets.map((secret) => {
				const decryptedValue = this.encryptionService.decrypt(secret.value);
				return new SecretDto(secret, decryptedValue);
			});
		} catch (error: unknown) {
			this.logger.error({ error, environmentId }, 'Failed to find secrets for environment.');
			throw new InternalServerErrorException('Failed to retrieve secrets.');
		}
	}

	async update(
		environmentId: string,
		secretId: number,
		updateSecretDto: UpdateSecretDto,
		actor: UserDto,
	): Promise<SecretDto> {
		const { value, description } = updateSecretDto;

		try {
			const result = await this.prisma.secret.updateMany({
				where: { id: secretId, environmentId: environmentId },
				data: {
					value: value ? this.encryptionService.encrypt(value) : undefined,
					description,
				},
			});

			if (result.count === 0) {
				throw new NotFoundException(
					`Secret with ID '${secretId}' not found in this environment.`,
				);
			}

			const updatedSecret = await this.prisma.secret.findUniqueOrThrow({
				where: { id: secretId },
			});

			this.eventEmitter.emit(AuditEvent, {
				actor,
				action: AuditAction.SECRET_UPDATED,
				targetId: updatedSecret.id.toString(),
				details: { key: updatedSecret.key },
			} satisfies AuditLogEvent);

			const finalValue = value ?? this.encryptionService.decrypt(updatedSecret.value);
			return new SecretDto(updatedSecret, finalValue);
		} catch (error: unknown) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			this.logger.error({ error }, `Failed to update secret ${secretId}.`);
			throw new InternalServerErrorException('Failed to update secret.');
		}
	}

	async remove(environmentId: string, secretId: number, actor: UserDto): Promise<void> {
		try {
			const result = await this.prisma.secret.deleteMany({
				where: { id: secretId, environmentId: environmentId },
			});

			if (result.count === 0) {
				throw new NotFoundException(
					`Secret with ID '${secretId}' not found in this environment.`,
				);
			}

			this.eventEmitter.emit(AuditEvent, {
				actor,
				action: AuditAction.SECRET_DELETED,
				targetId: secretId.toString(),
				details: { environmentId },
			} satisfies AuditLogEvent);
		} catch (error: unknown) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			this.logger.error({ error }, `Failed to delete secret ${secretId}.`);
			throw new InternalServerErrorException('Failed to delete secret.');
		}
	}
}
