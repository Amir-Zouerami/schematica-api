import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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

			return new SecretDto(newSecret, value); // Return with plaintext value
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
		const secrets = await this.prisma.secret.findMany({
			where: { environmentId },
			orderBy: { key: 'asc' },
		});

		return secrets.map((secret) => {
			const decryptedValue = this.encryptionService.decrypt(secret.value);
			return new SecretDto(secret, decryptedValue);
		});
	}

	async update(
		environmentId: string,
		secretId: number,
		updateSecretDto: UpdateSecretDto,
		actor: UserDto,
	): Promise<SecretDto> {
		const { value, description } = updateSecretDto;

		if (!value && !description) {
			const secret = await this.prisma.secret.findUniqueOrThrow({ where: { id: secretId } });
			const decryptedValue = this.encryptionService.decrypt(secret.value);
			return new SecretDto(secret, decryptedValue);
		}

		try {
			const updatedSecret = await this.prisma.secret.update({
				where: { id: secretId, environmentId: environmentId },
				data: {
					value: value ? this.encryptionService.encrypt(value) : undefined,
					description,
				},
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
			this.logger.error({ error }, `Failed to update secret ${secretId}.`);

			handlePrismaError(error, {
				[PrismaErrorCode.RecordNotFound]: new NotFoundException(
					`Secret with ID '${secretId}' not found in this environment.`,
				),
			});
		}
	}

	async remove(environmentId: string, secretId: number, actor: UserDto): Promise<void> {
		try {
			const secret = await this.prisma.secret.delete({
				where: { id: secretId, environmentId: environmentId },
			});

			this.eventEmitter.emit(AuditEvent, {
				actor,
				action: AuditAction.SECRET_DELETED,
				targetId: secret.id.toString(),
				details: { key: secret.key },
			} satisfies AuditLogEvent);
		} catch (error: unknown) {
			this.logger.error({ error }, `Failed to delete secret ${secretId}.`);

			handlePrismaError(error, {
				[PrismaErrorCode.RecordNotFound]: new NotFoundException(
					`Secret with ID '${secretId}' not found in this environment.`,
				),
			});
		}
	}
}
