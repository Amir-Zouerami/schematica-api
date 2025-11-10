import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { OpenAPIObject } from '@nestjs/swagger';
import type { ISpectralDiagnostic, RulesetDefinition } from '@stoplight/spectral-core';
import { Document, Spectral } from '@stoplight/spectral-core';
import Parsers from '@stoplight/spectral-parsers';
import { oas } from '@stoplight/spectral-rulesets';
import { DiagnosticSeverity } from '@stoplight/types';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class ApiLintingService {
	private spectral: Spectral;

	constructor(private readonly logger: PinoLogger) {
		this.logger.setContext(ApiLintingService.name);

		this.spectral = new Spectral();
		this.spectral.setRuleset({
			extends: [oas as RulesetDefinition],
			rules: {},
		});
	}

	/**
	 * Lints an OpenAPI document object against the configured ruleset.
	 * @param spec The OpenAPI document to lint.
	 * @returns A promise that resolves to an array of linting issues.
	 */
	async lintSpec(spec: OpenAPIObject): Promise<ISpectralDiagnostic[]> {
		try {
			const document = new Document(JSON.stringify(spec), Parsers.Json);
			const issues = await this.spectral.run(document);

			return issues.filter(
				(issue) => (issue.severity as DiagnosticSeverity) === DiagnosticSeverity.Error,
			);
		} catch (error: unknown) {
			this.logger.error(
				{ error },
				'An unexpected error occurred during API specification linting.',
			);

			throw new InternalServerErrorException('Failed to lint API specification.');
		}
	}
}
