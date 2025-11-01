import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import { UserDto } from 'src/auth/dto/user.dto';

/**
 * A guard that enforces the policy for who is allowed to create projects.
 * It ensures that only users with specific roles (e.g., admin, member) can
 * proceed, while denying access to less privileged roles like 'guest'.
 */
@Injectable()
export class ProjectCreationGuard implements CanActivate {
	private readonly allowedRoles: Role[] = [Role.admin, Role.member];

	canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest<FastifyRequest>();
		const user = request.user as UserDto;

		if (!user) {
			// should theoretically be covered by JwtAuthGuard (defensive programming)
			throw new ForbiddenException('Authentication credentials were not provided.');
		}

		const canCreate = this.allowedRoles.includes(user.role);

		if (!canCreate) {
			throw new ForbiddenException('You do not have permission to create a new project.');
		}

		return true;
	}
}
