import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Post,
	Put,
	UseGuards,
} from '@nestjs/common';
import {
	ApiBearerAuth,
	ApiCreatedResponse,
	ApiForbiddenResponse,
	ApiNoContentResponse,
	ApiNotFoundResponse,
	ApiOkResponse,
	ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UserDto } from 'src/auth/dto/user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { NoteDto } from '../notes/dto/note.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NotePermissionGuard } from './guards/note-permission.guard';
import { NotesService } from './notes.service';

@ApiTags('Projects - Notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class NotesController {
	constructor(private readonly notesService: NotesService) {}

	@Get('endpoints/:endpointId/notes')
	@UseGuards(NotePermissionGuard)
	@ApiOkResponse({
		description: 'A list of all notes for the specified endpoint.',
		type: [NoteDto],
	})
	@ApiForbiddenResponse({
		description: 'User does not have permission to view notes in this project.',
	})
	@ApiNotFoundResponse({ description: 'The specified endpoint was not found.' })
	findAll(@Param('endpointId') endpointId: string): Promise<NoteDto[]> {
		return this.notesService.findAllForEndpoint(endpointId);
	}

	@Post('endpoints/:endpointId/notes')
	@UseGuards(NotePermissionGuard)
	@ApiCreatedResponse({
		description: 'The note has been successfully created.',
		type: NoteDto,
	})
	@ApiForbiddenResponse({
		description: 'User does not have permission to add notes to this project.',
	})
	@ApiNotFoundResponse({ description: 'The specified endpoint was not found.' })
	create(
		@Param('endpointId') endpointId: string,
		@Body() createNoteDto: CreateNoteDto,
		@CurrentUser() user: UserDto,
	): Promise<NoteDto> {
		return this.notesService.create(endpointId, createNoteDto, user);
	}

	@Put('notes/:noteId')
	@UseGuards(NotePermissionGuard)
	@ApiOkResponse({
		description: 'The note has been successfully updated.',
		type: NoteDto,
	})
	@ApiForbiddenResponse({
		description: 'User does not have permission to manage notes in this project.',
	})
	@ApiNotFoundResponse({ description: 'The specified note was not found.' })
	update(
		@Param('noteId') noteId: string,
		@Body() updateNoteDto: UpdateNoteDto,
	): Promise<NoteDto> {
		return this.notesService.update(noteId, updateNoteDto);
	}

	@Delete('notes/:noteId')
	@UseGuards(NotePermissionGuard)
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiNoContentResponse({ description: 'The note has been successfully deleted.' })
	@ApiForbiddenResponse({
		description: 'User does not have permission to manage notes in this project.',
	})
	@ApiNotFoundResponse({ description: 'The specified note was not found.' })
	async remove(@Param('noteId') noteId: string): Promise<void> {
		await this.notesService.remove(noteId);
	}
}
