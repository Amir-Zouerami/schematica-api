import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from './base-app.exception';

export class SpecCircularDependencyException extends BaseAppException {
	constructor(details?: string) {
		super(
			{
				message:
					'The OpenAPI specification contains circular references (infinite loops) which cannot be processed.',
				hint: 'Check your "$ref" definitions. A component cannot refer to itself, either directly or indirectly.',
				details: details || null,
			},
			HttpStatus.UNPROCESSABLE_ENTITY,
			'SPEC_CIRCULAR_DEPENDENCY',
		);
	}
}
