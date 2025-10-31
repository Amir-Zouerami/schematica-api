import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from './base-app.exception';

export class UserConflictException extends BaseAppException {
	constructor(username: string) {
		super(
			`A user with the username "${username}" already exists.`,
			HttpStatus.CONFLICT,
			'USERNAME_ALREADY_EXISTS',
		);
	}
}
