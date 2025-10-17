// Path: src/auth/guards/roles.guard.ts

import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(private reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
			ROLES_KEY,
			[context.getHandler(), context.getClass()],
		);

		if (!requiredRoles?.length) {
			return true;
		}

		const { user } = context.switchToHttp().getRequest<FastifyRequest>();

		if (!user) {
			throw new ForbiddenException(
				'Authentication credentials were not provided.',
			);
		}

		const hasRole = requiredRoles.some((role) => user.role === role);

		if (!hasRole) {
			throw new ForbiddenException(
				'You do not have permission to perform this action.',
			);
		}

		return true;
	}
}
