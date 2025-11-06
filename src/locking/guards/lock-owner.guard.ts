import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { UserDto } from 'src/auth/dto/user.dto';
import { LockingService } from '../locking.service';

@Injectable()
export class LockOwnerGuard implements CanActivate {
	constructor(private readonly lockingService: LockingService) {}

	canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest<FastifyRequest>();
		const user = request.user as UserDto;
		const { endpointId } = request.params as { endpointId?: string };

		if (!endpointId) {
			throw new Error('LockOwnerGuard expects an endpointId route parameter.');
		}

		const hasLock = this.lockingService.isLockedBy(endpointId, user.id);

		if (!hasLock) {
			throw new ForbiddenException(
				'You must acquire a lock on this endpoint before you can save changes.',
			);
		}

		return true;
	}
}
