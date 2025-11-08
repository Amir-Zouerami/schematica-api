import fastifyPassport from '@fastify/passport';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { PinoLogger } from 'nestjs-pino';

/**
 * A custom guard to initiate the GitLab OAuth2 flow.
 *
 * This guard manually invokes the `fastify-passport` authentication handler.
 * Crucially, it uses `Function.prototype.call()` to explicitly set the `this`
 * context of the handler to the `FastifyInstance` (available at `request.server`),
 * which is required by the underlying library to function correctly in a Fastify
 * environment. This solves the `TypeError: res.setHeader is not a function`.
 */
@Injectable()
export class GitLabAuthGuard implements CanActivate {
	constructor(private readonly logger: PinoLogger) {
		this.logger.setContext(GitLabAuthGuard.name);
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<FastifyRequest>();
		const response = context.switchToHttp().getResponse<FastifyReply>();

		try {
			await fastifyPassport
				.authenticate('gitlab', {
					session: true,
				})
				.call(request.server, request, response);
		} catch (error: unknown) {
			this.logger.error({ error }, 'Error during GitLab authentication initiation.');
			throw error;
		}

		return true;
	}
}
