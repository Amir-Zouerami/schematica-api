import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from './base-app.exception';

export class ProjectCreationFailure extends BaseAppException {
	constructor(projectName) {
		super(
			`Failed to create the project: "${projectName}".`,
			HttpStatus.INTERNAL_SERVER_ERROR,
			'PROJECT_CREATION_FAILED',
		);
	}
}
