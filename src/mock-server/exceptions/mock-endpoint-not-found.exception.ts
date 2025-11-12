import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from 'src/common/exceptions/base-app.exception';

export class MockEndpointNotFoundException extends BaseAppException {
	constructor(method: string, path: string) {
		super(
			`Mock endpoint '${method.toUpperCase()} ${path}' not found in the project's specification.`,
			HttpStatus.NOT_FOUND,
			'MOCK_ENDPOINT_NOT_FOUND',
		);
	}
}
