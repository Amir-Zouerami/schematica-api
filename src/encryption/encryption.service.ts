import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { CipherGCM, createCipheriv, createDecipheriv, DecipherGCM, randomBytes } from 'node:crypto';
import { AllConfigTypes } from 'src/config/config.type';

@Injectable()
export class EncryptionService {
	private readonly key: Buffer;
	private readonly algorithm: string;
	private readonly ivLength: number;

	constructor(
		private readonly configService: ConfigService<AllConfigTypes, true>,
		private readonly logger: PinoLogger,
	) {
		this.logger.setContext(EncryptionService.name);

		const config = this.configService.get('encryption', { infer: true });
		this.key = Buffer.from(config.key, 'hex');
		this.algorithm = config.algorithm;
		this.ivLength = config.ivLength;
	}

	/**
	 * Encrypts a plaintext string.
	 * @returns A combined string containing the IV, auth tag, and encrypted data.
	 */
	encrypt(plainText: string): string {
		try {
			const iv = randomBytes(this.ivLength);
			const cipher = createCipheriv(this.algorithm, this.key, iv) as CipherGCM;
			const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
			const authTag = cipher.getAuthTag();

			return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
		} catch (error: unknown) {
			this.logger.error({ error }, 'Encryption failed. This is a critical error.');
			throw new InternalServerErrorException('Failed to encrypt data.');
		}
	}

	/**
	 * Decrypts a combined string back to plaintext.
	 * Throws an error if decryption fails, indicating tampering or a wrong key.
	 */
	decrypt(encryptedText: string): string {
		try {
			const [ivHex, authTagHex, encryptedHex] = encryptedText.split(':');
			if (!ivHex || !authTagHex || !encryptedHex) {
				throw new Error(
					'Invalid encrypted format. Encrypted text did not contain three parts.',
				);
			}

			const iv = Buffer.from(ivHex, 'hex');
			const authTag = Buffer.from(authTagHex, 'hex');
			const encrypted = Buffer.from(encryptedHex, 'hex');

			const decipher = createDecipheriv(this.algorithm, this.key, iv) as DecipherGCM;
			decipher.setAuthTag(authTag);
			const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

			return decrypted.toString('utf8');
		} catch (error: unknown) {
			this.logger.error(
				{ error },
				'Decryption failed. This may indicate data tampering or a key mismatch.',
			);

			throw new InternalServerErrorException('Failed to decrypt data.');
		}
	}
}
