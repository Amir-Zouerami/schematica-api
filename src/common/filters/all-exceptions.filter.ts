import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { FastifyRequest } from 'fastify';

const statusToMetaCode = {
	[HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
	[HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
	[HttpStatus.FORBIDDEN]: 'FORBIDDEN',
	[HttpStatus.NOT_FOUND]: 'NOT_FOUND',
	[HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
	constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

	catch(exception: unknown, host: ArgumentsHost): void {
		const { httpAdapter } = this.httpAdapterHost;
		const ctx = host.switchToHttp();
		const request = ctx.getRequest<FastifyRequest>();

		const httpStatus =
			exception instanceof HttpException
				? exception.getStatus()
				: HttpStatus.INTERNAL_SERVER_ERROR;

		let errorResponse: { message: string | string[]; error?: string };

		// --- FIX FOR `errorResponse.error` ---
		let errorType = 'InternalServerError'; // Default error type
		if (exception instanceof HttpException) {
			const response = exception.getResponse();
			errorResponse =
				typeof response === 'string'
					? { message: response }
					: (response as typeof errorResponse);
			// Safely access the `error` property
			errorType = errorResponse.error || exception.constructor.name;
		} else if (exception instanceof Error) {
			// If it's a generic Error, use its name
			errorResponse = {
				message: 'An unexpected internal server error occurred.',
			};
			errorType = exception.constructor.name;
		} else {
			// Handle cases where a non-Error is thrown
			errorResponse = { message: 'An unknown error occurred.' };
		}

		// --- FIX FOR `metaCode` ---
		const metaCode =
			// Use a type assertion to tell TypeScript that httpStatus is a valid key
			(statusToMetaCode as Record<number, string>)[httpStatus] ||
			'UNHANDLED_EXCEPTION';

		const responseBody = {
			meta: {
				requestId: request.id,
				timestamp: new Date().toISOString(),
				metaCode: metaCode,
			},
			data: null,
			error: {
				statusCode: httpStatus,
				message: errorResponse.message,
				type: errorType,
			},
		};

		httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
	}
}
