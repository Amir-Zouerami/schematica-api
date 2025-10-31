import {
	BadRequestException,
	CallHandler,
	createParamDecorator,
	ExecutionContext,
	Injectable,
	NestInterceptor,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { PinoLogger } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { UploadedFile as UploadedFileType } from 'src/types/fastify';

@Injectable()
export class FileInterceptor implements NestInterceptor {
	constructor(private readonly logger: PinoLogger) {
		this.logger.setContext(FileInterceptor.name);
	}

	async intercept(context: ExecutionContext, next: CallHandler) {
		const req = context.switchToHttp().getRequest<FastifyRequest>();

		if (typeof req.isMultipart !== 'function' || !req.isMultipart()) {
			throw new BadRequestException('Request is not multipart/form-data.');
		}

		const parts = req.parts();
		const body: Record<string, string | string[]> = {};
		let uploadedFile: UploadedFileType | undefined;

		try {
			for await (const part of parts) {
				if (part.type === 'file') {
					const tempDir = resolve(process.cwd(), 'public', 'uploads', 'tmp');
					await fs.mkdir(tempDir, { recursive: true });

					const tempPath = join(tempDir, `${randomUUID()}-${part.filename}`);
					const buffer = await part.toBuffer();
					await fs.writeFile(tempPath, buffer);

					uploadedFile = {
						fieldname: part.fieldname,
						originalname: part.filename,
						mimetype: part.mimetype,
						path: tempPath,
						size: buffer.length,
					};
				} else {
					if ('value' in part && typeof part.value === 'string') {
						const fieldname = part.fieldname;
						const value = part.value;

						if (body[fieldname]) {
							if (!Array.isArray(body[fieldname])) {
								body[fieldname] = [body[fieldname]];
							}
							body[fieldname].push(value);
						} else {
							body[fieldname] = value;
						}
					}
				}
			}
		} catch (error) {
			this.logger.error({ error: error as unknown }, 'Failed parsing multipart form.');

			if (uploadedFile?.path) {
				try {
					await fs.unlink(uploadedFile.path);
				} catch (e) {
					this.logger.warn(
						{ error: e as unknown },
						'Failed to cleanup temp file on error.',
					);
				}
			}
			throw new BadRequestException('Error processing multipart form data.');
		}

		req.body = body;
		req.uploadedFile = uploadedFile;

		return next.handle();
	}
}

export const UploadedFile = createParamDecorator(
	(_data: unknown, ctx: ExecutionContext): UploadedFileType | undefined => {
		const request = ctx.switchToHttp().getRequest<FastifyRequest>();
		return request.uploadedFile;
	},
);
