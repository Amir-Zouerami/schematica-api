import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AccessControlService } from 'src/access-control/access-control.service';
import { UserDto } from 'src/auth/dto/user.dto';

@Injectable()
export class ProjectOwnerGuard implements CanActivate {
	constructor(private readonly accessControlService: AccessControlService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<FastifyRequest>();
		const user = request.user as UserDto;

		if (!user) {
			throw new ForbiddenException('Authentication credentials were not provided.');
		}

		const projectId = (request.params as { projectId?: string }).projectId;
		if (!projectId) {
			throw new NotFoundException('Project ID not found in request parameters.');
		}

		const canOwn = await this.accessControlService.canOwnProject(user, projectId);

		if (!canOwn) {
			throw new ForbiddenException('You do not have permission to perform this action.');
		}

		return true;
	}
}
