import { ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PinoLogger } from 'nestjs-pino';
import { UserDto } from 'src/auth/dto/user.dto';
import { PrismaErrorCode } from 'src/common/constants/prisma-error-codes.constants';
import { EndpointNotFoundException } from 'src/common/exceptions/endpoint-not-found.exception';
import { NoteNotFoundException } from 'src/common/exceptions/note-not-found.exception';
import { handlePrismaError } from 'src/common/utils/prisma-error.util';
import { NoteChangeEvent, NoteEvent } from 'src/notifications/notifications.events';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { NoteDto, noteDtoInclude } from './dto/note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly logger: PinoLogger,
		private readonly eventEmitter: EventEmitter2,
	) {
		this.logger.setContext(NotesService.name);
	}

	async findAllForEndpoint(endpointId: string): Promise<NoteDto[]> {
		try {
			const notes = await this.prisma.note.findMany({
				where: { endpointId },
				include: noteDtoInclude,
				orderBy: { createdAt: 'asc' },
			});

			return notes.map((note) => new NoteDto(note));
		} catch (error: unknown) {
			this.logger.error({ error }, 'Failed to find notes for endpoint.');
			throw new InternalServerErrorException('Failed to retrieve notes.');
		}
	}

	async create(
		endpointId: string,
		createNoteDto: CreateNoteDto,
		user: UserDto,
	): Promise<NoteDto> {
		try {
			const endpoint = await this.prisma.endpoint.findUnique({
				where: { id: endpointId },
				select: { projectId: true },
			});

			if (!endpoint) throw new EndpointNotFoundException(endpointId);

			const newNote = await this.prisma.note.create({
				data: {
					content: createNoteDto.content,
					endpointId: endpointId,
					authorId: user.id,
				},
				include: noteDtoInclude,
			});

			this.eventEmitter.emit(NoteEvent.CREATED, {
				actor: user,
				note: newNote,
				project: { id: endpoint.projectId },
				endpoint: { id: endpointId },
			} satisfies NoteChangeEvent);

			return new NoteDto(newNote);
		} catch (error: unknown) {
			if (error instanceof EndpointNotFoundException) throw error;

			this.logger.error({ error }, 'Failed to create note.');
			throw new InternalServerErrorException('Failed to create note.');
		}
	}

	async update(noteIdStr: string, updateNoteDto: UpdateNoteDto, user: UserDto): Promise<NoteDto> {
		const noteId = parseInt(noteIdStr, 10);

		const note = await this.prisma.note.findUnique({
			where: { id: noteId },
			select: { authorId: true },
		});

		if (!note) {
			throw new NoteNotFoundException(noteIdStr);
		}

		if (note.authorId !== user.id) {
			throw new ForbiddenException('You can only edit your own notes.');
		}

		try {
			const updatedNote = await this.prisma.note.update({
				where: { id: noteId },
				data: {
					content: updateNoteDto.content,
				},
				include: {
					...noteDtoInclude,
					endpoint: { select: { id: true, projectId: true } },
				},
			});

			this.eventEmitter.emit(NoteEvent.UPDATED, {
				actor: user,
				note: updatedNote,
				project: { id: updatedNote.endpoint.projectId },
				endpoint: { id: updatedNote.endpoint.id },
			} satisfies NoteChangeEvent);

			return new NoteDto(updatedNote);
		} catch (error: unknown) {
			this.logger.error({ error }, `Failed to update note ${noteIdStr}.`);

			handlePrismaError(error, {
				[PrismaErrorCode.RecordNotFound]: new NoteNotFoundException(noteIdStr),
			});
		}
	}

	async remove(noteIdStr: string, user: UserDto): Promise<void> {
		const noteId = parseInt(noteIdStr, 10);

		const note = await this.prisma.note.findUnique({
			where: { id: noteId },
			select: { authorId: true },
		});

		if (!note) {
			throw new NoteNotFoundException(noteIdStr);
		}

		if (user.role !== 'admin' && note.authorId !== user.id) {
			throw new ForbiddenException('You can only delete your own notes.');
		}

		try {
			await this.prisma.note.delete({
				where: { id: noteId },
			});
		} catch (error: unknown) {
			this.logger.error({ error }, 'Failed to delete note.');
			handlePrismaError(error);
		}
	}
}
