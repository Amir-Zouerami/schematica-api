import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from './base-app.exception';

export class ProjectConflictException extends BaseAppException {
	constructor(projectName: string) {
		super(
			`A project with the name '${projectName}' already exists.`,
			HttpStatus.CONFLICT,
			'PROJECT_NAME_ALREADY_EXISTS',
		);
	}
}
