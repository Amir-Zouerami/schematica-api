import fastifyPassport from '@fastify/passport';
import {
	CanActivate,
	ExecutionContext,
	Injectable,
	InternalServerErrorException,
	UnauthorizedException,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { PinoLogger } from 'nestjs-pino';
import { UserWithTeams } from 'src/users/users.types';

/**
 * A custom guard to handle the callback from the GitLab OAuth2 flow.
 *
 * This guard manually invokes the `fastify-passport` authentication handler
 * with a custom callback to gain control over the post-authentication process.
 * It is responsible for handling errors, creating the session via `req.logIn`,
 * and attaching the validated user to the request object before allowing the
 * request to proceed to the final route handler.
 */
@Injectable()
export class GitLabCallbackGuard implements CanActivate {
	constructor(private readonly logger: PinoLogger) {
		this.logger.setContext(GitLabCallbackGuard.name);
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<FastifyRequest>();
		const response = context.switchToHttp().getResponse<FastifyReply>();

		const user = await this.authenticate(request, response);
		request.user = user;

		return true;
	}

	/**
	 * A promise-based wrapper around Passport's callback-style authenticate function.
	 */
	private authenticate(request: FastifyRequest, response: FastifyReply): Promise<UserWithTeams> {
		return new Promise((resolve, reject) => {
			const authenticateFn = fastifyPassport.authenticate(
				'gitlab',
				{},
				async (
					req: FastifyRequest,
					_reply: FastifyReply,
					err: Error | null,
					user: UserWithTeams | false,
				) => {
					if (err) {
						this.logger.error({ err }, 'GitLab authentication callback error.');
						return reject(new UnauthorizedException('GitLab authentication failed.'));
					}

					if (!user) {
						this.logger.warn('GitLab authentication provided no user.');
						return reject(
							new UnauthorizedException(
								'GitLab authentication failed to provide user details.',
							),
						);
					}

					try {
						await req.logIn(user);
						resolve(user);
					} catch (loginErr: unknown) {
						this.logger.error(
							{ err: loginErr },
							'Session creation failed after GitLab auth.',
						);

						reject(new InternalServerErrorException('Could not create session.'));
					}
				},
			);

			authenticateFn.call(request.server, request, response);
		});
	}
}
