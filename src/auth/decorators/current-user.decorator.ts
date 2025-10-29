import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { FastifyRequest } from 'fastify';

type FastifyRequestWithUser = FastifyRequest & { user: Omit<User, 'password'> };

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
	const request = ctx.switchToHttp().getRequest<FastifyRequestWithUser>();
	return request.user;
});
