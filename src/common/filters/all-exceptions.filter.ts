import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
	NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import { FastifyReply, FastifyRequest } from 'fastify';
import { PinoLogger } from 'nestjs-pino';
import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import { AllConfigTypes } from 'src/config/config.type';
import { BaseAppException } from '../exceptions/base-app.exception';

const statusToMetaCode = {
	[HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
	[HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
	[HttpStatus.FORBIDDEN]: 'FORBIDDEN',
	[HttpStatus.NOT_FOUND]: 'NOT_FOUND',
	[HttpStatus.CONFLICT]: 'CONFLICT',
	[HttpStatus.PAYLOAD_TOO_LARGE]: 'PAYLOAD_TOO_LARGE',
	[HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
} as const;

interface NestErrorResponse {
	message: string | string[] | object;
	error?: string;
}

function isNestErrorResponse(value: unknown): value is NestErrorResponse {
	return typeof value === 'object' && value !== null && 'message' in value;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
	private readonly globalPrefix: string;
	private readonly nodeEnv: string;

	constructor(
		private readonly httpAdapterHost: HttpAdapterHost,
		private readonly logger: PinoLogger,
		configService: ConfigService<AllConfigTypes, true>,
	) {
		this.globalPrefix = configService.get('app.globalPrefix', { infer: true });
		this.nodeEnv = configService.get('app.nodeEnv', { infer: true });
	}

	catch(exception: unknown, host: ArgumentsHost): void {
		// SPA fallback for non-API routes.
		if (exception instanceof NotFoundException) {
			const ctx = host.switchToHttp();
			const request = ctx.getRequest<FastifyRequest>();
			const url = request.raw.url ?? '';

			// Ignore socket.io paths
			if (url.startsWith('/socket.io')) {
				this.handleApiError(exception, host);
				return;
			}

			// Serve index.html for non-API paths (e.g. /auth/callback, /projects/123)
			if (this.nodeEnv !== 'test' && !url.startsWith(`/${this.globalPrefix}`)) {
				const response = ctx.getResponse<FastifyReply>();
				const filePath = join(process.cwd(), 'public', 'index.html');
				const stream = createReadStream(filePath);

				stream.on('error', () => {
					this.handleApiError(exception, host);
				});

				response.type('text/html').send(stream);
				return;
			}
		}

		this.handleApiError(exception, host);
	}

	private handleApiError(exception: unknown, host: ArgumentsHost): void {
		const { httpAdapter } = this.httpAdapterHost;
		const ctx = host.switchToHttp();
		const request = ctx.getRequest<FastifyRequest>();

		const { httpStatus, message, metaCode, type } = this.parseException(exception);

		if (httpStatus >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
			this.logger.error({
				message: `[Unhandled Exception] HTTP ${httpStatus}`,
				request: {
					id: request.id,
					url: request.url,
					method: request.method,
				},
				errorPayload: message,
				stack: exception instanceof Error ? exception.stack : undefined,
				exception,
			});
		}

		const responseBody = {
			meta: {
				requestId: request.id,
				timestamp: new Date().toISOString(),
				metaCode,
			},
			data: null,
			error: {
				statusCode: httpStatus,
				message,
				type,
			},
		};

		httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
	}

	private parseException(exception: unknown): {
		httpStatus: number;
		message: unknown;
		metaCode: string;
		type: string;
	} {
		if (exception instanceof HttpException) {
			const httpStatus = exception.getStatus();
			const response = exception.getResponse();
			const messagePayload = isNestErrorResponse(response) ? response : { message: response };

			const metaCode: string =
				exception instanceof BaseAppException
					? exception.metaCode
					: (statusToMetaCode[httpStatus as keyof typeof statusToMetaCode] ??
						'UNHANDLED_HTTP_EXCEPTION');

			const type =
				isNestErrorResponse(response) && response.error
					? response.error
					: exception.constructor.name;

			return {
				httpStatus,
				message: messagePayload,
				metaCode,
				type,
			};
		}

		return {
			httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
			message: { message: 'An unexpected internal server error occurred.' },
			metaCode: 'INTERNAL_SERVER_ERROR',
			type: exception instanceof Error ? exception.constructor.name : 'UnknownError',
		};
	}
}
