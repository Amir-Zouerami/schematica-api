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

type KnownMetaCode = (typeof statusToMetaCode)[keyof typeof statusToMetaCode];

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
			const formattedMessage = Array.isArray(message) ? message.join(', ') : message;

			const logObject = {
				message: `[Unhandled Exception] HTTP ${httpStatus} - ${formattedMessage}`,
				request: {
					id: request.id,
					url: request.url,
					method: request.method,
				},

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
		if (exception instanceof BaseAppException) {
			return {
				httpStatus: exception.getStatus(),
				message: exception.message,
				metaCode: exception.metaCode,
				type: exception.constructor.name,
			};
		}

		if (exception instanceof HttpException) {
			const httpStatus = exception.getStatus();
			const response = exception.getResponse();

			const errorResponse =
				typeof response === 'string'
					? { message: response }
					: (response as {
							message: string | string[];
							error?: string;
						});

			const metaCode: KnownMetaCode =
				statusToMetaCode[httpStatus as keyof typeof statusToMetaCode] ??
				'UNHANDLED_HTTP_EXCEPTION';

			return {
				httpStatus,
				message: errorResponse.message,
				metaCode,
				type: errorResponse.error || exception.constructor.name,
			};
		}

		return {
			httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
			message: 'An unexpected internal server error occurred.',
			metaCode: 'INTERNAL_SERVER_ERROR',
			type: exception instanceof Error ? exception.constructor.name : 'UnknownError',
		};
	}
}
