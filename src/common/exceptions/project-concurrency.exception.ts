import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from './base-app.exception';

export class ProjectConcurrencyException extends BaseAppException {
	constructor() {
		super(
			'This project has been updated by someone else since you started editing.',
			HttpStatus.CONFLICT,
			'PROJECT_CONCURRENCY_CONFLICT',
		);
	}
}
