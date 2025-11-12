import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from 'src/common/exceptions/base-app.exception';

export class MockGenerationConflictException extends BaseAppException {
	constructor(method: string, path: string, statusCode: string) {
		super(
			`Cannot generate mock body. The OpenAPI specification for this project is incomplete. The success response ('${statusCode}') for endpoint '${method.toUpperCase()} ${path}' is missing a valid 'content' schema.`,
			HttpStatus.CONFLICT,
			'MOCK_GENERATION_CONFLICT',
		);
	}
}
