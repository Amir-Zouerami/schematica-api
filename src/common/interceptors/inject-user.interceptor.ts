import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { PinoLogger } from 'nestjs-pino';
import { Observable } from 'rxjs';

@Injectable()
export class InjectUserInterceptor implements NestInterceptor {
	constructor(private readonly logger: PinoLogger) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest<FastifyRequest>();
		const response = context.switchToHttp().getResponse<FastifyReply>();

		if (request.user) {
			const userPayload = {
				user: {
					id: request.user.id,
					username: request.user.username,
				},
			};

			// For custom logs within services:
			// This adds the `user` object to the request-scoped logger instance.
			this.logger.assign(userPayload);

			// For the final "request completed" log:
			// This attaches the data for pino-http to find at the end.
			response.raw.customProps = userPayload;
		}

		return next.handle();
	}
}
