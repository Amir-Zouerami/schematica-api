import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { UserDto } from 'src/auth/dto/user.dto';
import { PrismaErrorCode } from 'src/common/constants/prisma-error-codes.constants';
import { NoteNotFoundException } from 'src/common/exceptions/note-not-found.exception';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { NoteDto, noteDtoInclude } from './dto/note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly logger: PinoLogger,
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
			const newNote = await this.prisma.note.create({
				data: {
					content: createNoteDto.content,
					endpointId: endpointId,
					authorId: user.id,
				},
				include: noteDtoInclude,
			});

			return new NoteDto(newNote);
		} catch (error: unknown) {
			this.logger.error({ error }, 'Failed to create note.');
			throw new InternalServerErrorException('Failed to create note.');
		}
	}

	async update(noteIdStr: string, updateNoteDto: UpdateNoteDto): Promise<NoteDto> {
		const noteId = parseInt(noteIdStr, 10);

		try {
			const updatedNote = await this.prisma.note.update({
				where: { id: noteId },
				data: {
					content: updateNoteDto.content,
				},
				include: noteDtoInclude,
			});

			return new NoteDto(updatedNote);
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				(error.code as PrismaErrorCode) === PrismaErrorCode.RecordNotFound
			) {
				throw new NoteNotFoundException(noteIdStr);
			}

			this.logger.error({ error }, 'Failed to update note.');
			throw new InternalServerErrorException('Failed to update note.');
		}
	}

	async remove(noteIdStr: string): Promise<void> {
		const noteId = parseInt(noteIdStr, 10);

		try {
			await this.prisma.note.delete({
				where: { id: noteId },
			});
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				(error.code as PrismaErrorCode) === PrismaErrorCode.RecordNotFound
			) {
				throw new NoteNotFoundException(noteIdStr);
			}

			this.logger.error({ error }, 'Failed to delete note.');
			throw new InternalServerErrorException('Failed to delete note.');
		}
	}
}
