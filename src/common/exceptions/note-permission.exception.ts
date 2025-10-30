import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from './base-app.exception';

export class NotePermissionException extends BaseAppException {
	constructor() {
		super(
			'You do not have permission to manage notes in this project.',
			HttpStatus.FORBIDDEN,
			'NOTE_PERMISSION_DENIED',
		);
	}
}
