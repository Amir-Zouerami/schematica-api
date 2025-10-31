import type { Multipart, MultipartFile, MultipartValue } from '@fastify/multipart';
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
import { basename, join, resolve } from 'node:path';
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

		const parts: AsyncIterableIterator<Multipart> = req.parts();
		const body: Record<string, string | string[]> = {};
		let uploadedFile: UploadedFileType | undefined;

		try {
			for await (const part of parts) {
				if (isFilePart(part)) {
					const tempDir = resolve(process.cwd(), 'public', 'uploads', 'tmp');
					await fs.mkdir(tempDir, { recursive: true });

					const originalName = part.filename ?? 'upload';
					const safeName = basename(originalName).replace(/[^A-Za-z0-9._-]/g, '_');
					const tempPath = join(tempDir, `${randomUUID()}-${safeName}`);
					const buffer = await part.toBuffer();
					await fs.writeFile(tempPath, buffer);

					uploadedFile = {
						fieldname: part.fieldname,
						originalname: originalName,
						mimetype: part.mimetype,
						path: tempPath,
						size: buffer.length,
					};
				} else if (isFieldPart(part)) {
					const fieldname = part.fieldname;
					const value = String(part.value);

					const existing = body[fieldname];
					if (Array.isArray(existing)) {
						existing.push(value);
					} else if (typeof existing === 'string') {
						body[fieldname] = [existing, value];
					} else {
						body[fieldname] = value;
					}
				}
			}
		} catch (error: unknown) {
			this.logger.error({ error: error }, 'Failed parsing multipart form.');

			if (uploadedFile?.path) {
				try {
					await fs.unlink(uploadedFile.path);
				} catch (e: unknown) {
					this.logger.warn({ error: e }, 'Failed to cleanup temp file on error.');
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

function isFilePart(part: Multipart): part is MultipartFile {
	return part.type === 'file';
}

function isFieldPart(part: Multipart): part is MultipartValue {
	return part.type === 'field' && typeof part.value === 'string';
}
