import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from './base-app.exception';

export class SpecValidationException extends BaseAppException {
	constructor(validationError: string) {
		super(
			`Invalid OpenAPI specification: ${validationError}`,
			HttpStatus.BAD_REQUEST,
			'SPEC_VALIDATION_FAILED',
		);
	}
}
