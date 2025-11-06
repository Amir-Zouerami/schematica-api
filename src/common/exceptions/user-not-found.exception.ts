import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from './base-app.exception';

export class UserNotFoundException extends BaseAppException {
	constructor(userId: string) {
		super(`User with ID '${userId}' not found.`, HttpStatus.NOT_FOUND, 'USER_NOT_FOUND');
	}
}
