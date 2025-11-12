import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from 'src/common/exceptions/base-app.exception';

export class MockResponseNotFoundException extends BaseAppException {
	constructor(method: string, path: string, statusCode: string) {
		super(
			`Response with status code '${statusCode}' is not defined for endpoint '${method.toUpperCase()} ${path}' in the project's specification.`,
			HttpStatus.NOT_FOUND,
			'MOCK_RESPONSE_NOT_FOUND',
		);
	}
}
