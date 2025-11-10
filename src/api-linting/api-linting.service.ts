import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { OpenAPIObject } from '@nestjs/swagger';
import {
	Document,
	ISpectralDiagnostic,
	RulesetDefinition,
	Spectral,
} from '@stoplight/spectral-core';
// biome-ignore lint/performance/noNamespaceImport: there is no default import for this CommonJS package
import * as Parsers from '@stoplight/spectral-parsers';
import { bundleAndLoadRuleset } from '@stoplight/spectral-ruleset-bundler/with-loader';
import { DiagnosticSeverity } from '@stoplight/types';
import { PinoLogger } from 'nestjs-pino';
import fs from 'node:fs';
import { resolve } from 'node:path';

@Injectable()
export class ApiLintingService implements OnModuleInit {
	private spectral: Spectral;

	constructor(private readonly logger: PinoLogger) {
		this.logger.setContext(ApiLintingService.name);
		this.spectral = new Spectral();
	}

	async onModuleInit() {
		try {
			const rulesetFilepath = resolve(process.cwd(), '.spectral.yaml');
			const ruleset = await bundleAndLoadRuleset(rulesetFilepath, { fs, fetch });
			this.spectral.setRuleset(ruleset);

			this.logger.info('Custom Spectral ruleset loaded successfully.');
		} catch (error: unknown) {
			this.logger.error(
				error,
				'Failed to load custom Spectral ruleset. Linting will be degraded.',
			);

			const { oas } = await import('@stoplight/spectral-rulesets');
			this.spectral.setRuleset({
				extends: [oas as RulesetDefinition],
				rules: {},
			});
		}
	}

	async lintSpec(spec: OpenAPIObject): Promise<ISpectralDiagnostic[]> {
		try {
			const document = new Document(JSON.stringify(spec), Parsers.Json);
			const issues = await this.spectral.run(document);

			return issues.filter(
				(issue) => (issue.severity as DiagnosticSeverity) === DiagnosticSeverity.Error,
			);
		} catch (error: unknown) {
			this.logger.error(
				error,
				'An unexpected error occurred during API specification linting.',
			);

			throw new InternalServerErrorException(
				`Failed to lint API specification: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}
}
