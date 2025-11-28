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
import { ErrorResponseDto } from 'src/common/dto/error-response.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserDto } from '../../auth/dto/user.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
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
		type: ErrorResponseDto,
	})
	@ApiNotFoundResponse({
		description: 'The specified endpoint was not found.',
		type: ErrorResponseDto,
	})
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
		type: ErrorResponseDto,
	})
	@ApiNotFoundResponse({
		description: 'The specified endpoint was not found.',
		type: ErrorResponseDto,
	})
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
		type: ErrorResponseDto,
	})
	@ApiNotFoundResponse({
		description: 'The specified note was not found.',
		type: ErrorResponseDto,
	})
	update(
		@Param('noteId') noteId: string,
		@Body() updateNoteDto: UpdateNoteDto,
		@CurrentUser() user: UserDto,
	): Promise<NoteDto> {
		return this.notesService.update(noteId, updateNoteDto, user);
	}

	@Delete('notes/:noteId')
	@UseGuards(NotePermissionGuard)
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiNoContentResponse({ description: 'The note has been successfully deleted.' })
	@ApiForbiddenResponse({
		description: 'User does not have permission to manage notes in this project.',
		type: ErrorResponseDto,
	})
	@ApiNotFoundResponse({
		description: 'The specified note was not found.',
		type: ErrorResponseDto,
	})
	async remove(@Param('noteId') noteId: string): Promise<void> {
		await this.notesService.remove(noteId);
	}
}
