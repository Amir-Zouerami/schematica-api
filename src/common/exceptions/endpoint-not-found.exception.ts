import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from './base-app.exception';

export class EndpointNotFoundException extends BaseAppException {
	constructor(endpointId: string) {
		super(
			`Endpoint with ID "${endpointId}" not found.`,
			HttpStatus.NOT_FOUND,
			'ENDPOINT_NOT_FOUND',
		);
	}
}
