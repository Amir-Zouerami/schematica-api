import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from './base-app.exception';

export class ProjectNotFoundException extends BaseAppException {
	constructor(projectId: string) {
		super(
			`Project with ID '${projectId}' not found or you do not have permission to view it.`,
			HttpStatus.NOT_FOUND,
			'PROJECT_NOT_FOUND',
		);
	}
}
