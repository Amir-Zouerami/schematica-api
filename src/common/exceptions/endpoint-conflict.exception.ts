import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from './base-app.exception';

export class EndpointConflictException extends BaseAppException {
	constructor(method: string, path: string) {
		super(
			`Endpoint '${method.toUpperCase()} ${path}' already exists in this project.`,
			HttpStatus.CONFLICT,
			'ENDPOINT_ALREADY_EXISTS',
		);
	}
}
