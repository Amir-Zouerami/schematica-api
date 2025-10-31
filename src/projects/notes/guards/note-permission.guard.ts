import {
	BadRequestException,
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AccessControlService } from 'src/access-control/access-control.service';
import { UserDto } from 'src/auth/dto/user.dto';
import { EndpointNotFoundException } from 'src/common/exceptions/endpoint-not-found.exception';
import { NoteNotFoundException } from 'src/common/exceptions/note-not-found.exception';
import { NotePermissionException } from 'src/common/exceptions/note-permission.exception';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotePermissionGuard implements CanActivate {
	constructor(
		private readonly prisma: PrismaService,
		private readonly accessControlService: AccessControlService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<FastifyRequest>();
		const user = request.user as UserDto;
		const params = request.params as { endpointId?: string; noteId?: string };

		if (user.role === 'admin') return true;

		const projectId = await this.getProjectIdFromRequest(params);
		const isReadOperation = request.method.toUpperCase() === 'GET';

		const hasPermission = isReadOperation
			? await this.accessControlService.canViewProject(user, projectId)
			: await this.accessControlService.canOwnProject(user, projectId);

		if (!hasPermission) {
			throw new NotePermissionException();
		}

		return true;
	}

	private async getProjectIdFromRequest(params: {
		endpointId?: string;
		noteId?: string;
	}): Promise<string> {
		if (params.noteId) {
			const noteId = parseInt(params.noteId, 10);
			if (Number.isNaN(noteId)) throw new BadRequestException('Invalid Note ID format.');

			const note = await this.prisma.note.findUnique({
				where: { id: noteId },
				select: { endpoint: { select: { projectId: true } } },
			});

			if (!note?.endpoint) throw new NoteNotFoundException(params.noteId);
			return note.endpoint.projectId;
		}

		if (params.endpointId) {
			const endpoint = await this.prisma.endpoint.findUnique({
				where: { id: params.endpointId },
				select: { projectId: true },
			});

			if (!endpoint) throw new EndpointNotFoundException(params.endpointId);
			return endpoint.projectId;
		}

		throw new ForbiddenException('Could not determine the project for this resource.');
	}
}
