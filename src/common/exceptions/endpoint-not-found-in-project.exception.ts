import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from './base-app.exception';

export class EndpointNotFoundInProjectException extends BaseAppException {
	constructor(endpointId: string, projectId: string) {
		super(
			`Endpoint with ID "${endpointId}" was not found in project "${projectId}".`,
			HttpStatus.NOT_FOUND,
			'ENDPOINT_PROJECT_MISMATCH',
		);
	}
}
