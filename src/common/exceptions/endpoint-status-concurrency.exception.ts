import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from './base-app.exception';

export class EndpointStatusConcurrencyException extends BaseAppException {
	constructor() {
		super(
			'This endpoint’s status has been changed by someone else. Please refresh and try again.',
			HttpStatus.CONFLICT,
			'ENDPOINT_STATUS_CONCURRENCY_CONFLICT',
		);
	}
}
