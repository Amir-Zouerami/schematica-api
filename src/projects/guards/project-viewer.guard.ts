import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AccessControlService } from 'src/access-control/access-control.service';
import { UserDto } from 'src/auth/dto/user.dto';
import { ProjectNotFoundException } from 'src/common/exceptions/project-not-found.exception';

@Injectable()
export class ProjectViewerGuard implements CanActivate {
	constructor(private readonly accessControlService: AccessControlService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<FastifyRequest>();
		const user = request.user as UserDto;
		const { projectId } = request.params as { projectId?: string };

		if (!projectId) {
			throw new Error('ProjectViewerGuard expects a projectId route parameter.');
		}

		const canView = await this.accessControlService.canViewProject(user, projectId);

		if (!canView) {
			throw new ProjectNotFoundException(projectId);
		}

		return true;
	}
}
