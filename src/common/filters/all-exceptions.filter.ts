import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { PinoLogger } from 'nestjs-pino';
import { BaseAppException } from '../exceptions/base-app.exception';

const statusToMetaCode = {
	[HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
	[HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
	[HttpStatus.FORBIDDEN]: 'FORBIDDEN',
	[HttpStatus.NOT_FOUND]: 'NOT_FOUND',
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
	constructor(
		private readonly httpAdapterHost: HttpAdapterHost,
		private readonly logger: PinoLogger,
	) {}

	catch(exception: unknown, host: ArgumentsHost): void {
		const { httpAdapter } = this.httpAdapterHost;
		const ctx = host.switchToHttp();
		const request = ctx.getRequest<FastifyRequest>();

		const { httpStatus, message, metaCode, type } = this.parseException(exception);

		if (httpStatus >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
			const logObject = {
				message: `[Unhandled Exception] HTTP ${httpStatus}`,
				request: {
					id: request.id,
					url: request.url,
					method: request.method,
				},
				errorPayload: message,
				stack: exception instanceof Error ? exception.stack : undefined,
				exception,
			};
			this.logger.error(logObject);
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

	private parseException(exception: unknown) {
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
