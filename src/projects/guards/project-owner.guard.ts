import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { UserDto } from 'src/auth/dto/user.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProjectOwnerGuard implements CanActivate {
	constructor(private readonly prisma: PrismaService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<FastifyRequest>();
		const user = request.user as UserDto;

		if (user.role === 'admin') return true;

		const projectId = (request.params as { projectId?: string }).projectId;
		if (!projectId) {
			throw new NotFoundException(
				'Project ID not found in request parameters.',
			);
		}

		const projectAccess = await this.prisma.userProjectAccess.findFirst({
			where: {
				projectId,
				userId: user.id,
				type: 'OWNER',
			},
		});

		if (!projectAccess) {
			throw new ForbiddenException(
				'You do not have permission to perform this action.',
			);
		}

		return true;
	}
}
