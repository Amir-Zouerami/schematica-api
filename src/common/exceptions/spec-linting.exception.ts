import { HttpStatus } from '@nestjs/common';
import { ISpectralDiagnostic } from '@stoplight/spectral-core';
import { BaseAppException } from './base-app.exception';

interface LintingError {
	path: (string | number)[];
	message: string;
	code: string | number;
}

export class SpecLintingException extends BaseAppException {
	constructor(issues: ISpectralDiagnostic[]) {
		const formattedErrors: LintingError[] = issues.map((issue) => ({
			path: issue.path,
			message: issue.message,
			code: issue.code,
		}));

		const responsePayload = {
			message: `The provided OpenAPI specification failed the linting process with ${issues.length} error(s).`,
			errors: formattedErrors,
		};

		super(responsePayload, HttpStatus.BAD_REQUEST, 'SPEC_LINTING_FAILED');
	}
}
