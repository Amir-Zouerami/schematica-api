import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from './base-app.exception';

export class EndpointConcurrencyException extends BaseAppException {
	constructor() {
		super(
			'This endpoint has been updated by someone else since you started editing.',
			HttpStatus.CONFLICT,
			'ENDPOINT_CONCURRENCY_CONFLICT',
		);
	}
}
