import {
	BadRequestException,
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import { UserDto } from 'src/auth/dto/user.dto';
import { EndpointNotFoundException } from 'src/common/exceptions/endpoint-not-found.exception';
import { NoteNotFoundException } from 'src/common/exceptions/note-not-found.exception';
import { NotePermissionException } from 'src/common/exceptions/note-permission.exception';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotePermissionGuard implements CanActivate {
	constructor(private readonly prisma: PrismaService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<FastifyRequest>();
		const user = request.user as UserDto;
		const params = request.params as { endpointId?: string; noteId?: string };

		if (!user) {
			throw new ForbiddenException('Authentication credentials were not provided.');
		}

		if (user.role === Role.admin) {
			return true;
		}

		let projectId: string | null = null;

		if (params.noteId) {
			const noteId = Number(params.noteId);

			if (Number.isNaN(noteId)) {
				throw new BadRequestException('Invalid Note ID format.');
			}

			const note = await this.prisma.note.findUnique({
				where: { id: noteId },
				select: { endpoint: { select: { projectId: true } } },
			});

			if (!note || !note.endpoint) {
				throw new NoteNotFoundException(params.noteId);
			}

			projectId = note.endpoint.projectId;
		} else if (params.endpointId) {
			const endpoint = await this.prisma.endpoint.findUnique({
				where: { id: params.endpointId },
				select: { projectId: true },
			});

			if (!endpoint) {
				throw new EndpointNotFoundException(params.endpointId);
			}

			projectId = endpoint.projectId;
		}

		if (!projectId) {
			throw new ForbiddenException('Could not determine the project for this resource.');
		}

		const isOwner = await this.isProjectOwner(user, projectId);

		if (!isOwner) {
			throw new NotePermissionException();
		}

		return true;
	}

	private async isProjectOwner(user: UserDto, projectId: string): Promise<boolean> {
		const userAccess = await this.prisma.userProjectAccess.findFirst({
			where: { userId: user.id, projectId, type: 'OWNER' },
		});

		if (userAccess) {
			return true;
		}

		const userTeamIds = user.teams?.map((t) => t.id) ?? [];

		if (userTeamIds.length > 0) {
			const teamAccess = await this.prisma.teamProjectAccess.findFirst({
				where: {
					teamId: { in: userTeamIds },
					projectId,
					type: 'OWNER',
				},
			});

			if (teamAccess) {
				return true;
			}
		}

		return false;
	}
}
