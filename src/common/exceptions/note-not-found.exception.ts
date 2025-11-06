import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from './base-app.exception';

export class NoteNotFoundException extends BaseAppException {
	constructor(noteId: string) {
		super(`Note with ID '${noteId}' not found.`, HttpStatus.NOT_FOUND, 'NOTE_NOT_FOUND');
	}
}
