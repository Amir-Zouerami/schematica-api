import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import { UserDto } from 'src/auth/dto/user.dto';
import { ProjectNotFoundException } from 'src/common/exceptions/project-not-found.exception';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProjectViewerGuard implements CanActivate {
	constructor(private readonly prisma: PrismaService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<FastifyRequest>();
		const user = request.user as UserDto;
		const { projectId } = request.params as { projectId?: string };

		if (!projectId) {
			throw new Error('ProjectViewerGuard expects a projectId route parameter.');
		}

		if (user.role === Role.admin) {
			return true;
		}

		const project = await this.prisma.project.findFirst({
			where: {
				id: projectId,
				deniedUsers: { none: { id: user.id } },
				OR: [
					{ userAccesses: { some: { userId: user.id } } },
					{ teamAccesses: { some: { teamId: { in: user.teams?.map((t) => t.id) } } } },
				],
			},
			select: { id: true },
		});

		if (!project) {
			throw new ProjectNotFoundException(projectId);
		}

		return true;
	}
}
