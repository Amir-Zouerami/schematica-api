import SwaggerParser from '@apidevtools/swagger-parser';
import { Faker, en, fa, type LocaleDefinition } from '@faker-js/faker';
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { JSONSchemaFaker, Schema } from 'json-schema-faker';
import { PinoLogger } from 'nestjs-pino';
import { OpenAPIV3 } from 'openapi-types';
import { match } from 'path-to-regexp';
import { AccessControlService } from 'src/access-control/access-control.service';
import { UserDto } from 'src/auth/dto/user.dto';
import { VALID_HTTP_METHODS } from 'src/common/constants/http.constants';
import { ProjectNotFoundException } from 'src/common/exceptions/project-not-found.exception';
import { ProjectsService } from 'src/projects/projects.service';
import { MockEndpointNotFoundException } from './exceptions/mock-endpoint-not-found.exception';
import { MockGenerationConflictException } from './exceptions/mock-generation-conflict.exception';
import { MockResponseNotFoundException } from './exceptions/mock-response-not-found.exception';

interface MockResponse {
	body: unknown;
	statusCode: number;
}

const SUPPORTED_LOCALES: Record<string, LocaleDefinition> = {
	en,
	fa,
};

@Injectable()
export class MockServerService {
	constructor(
		private readonly logger: PinoLogger,
		private readonly projectsService: ProjectsService,
		private readonly accessControlService: AccessControlService,
	) {
		this.logger.setContext(MockServerService.name);
	}

	async generateMockResponse(
		projectId: string | undefined,
		method: string,
		path: string,
		user: UserDto,
		requestedStatusCode?: string,
		requestedLocale?: string,
	): Promise<MockResponse> {
		if (!projectId) {
			throw new BadRequestException('The "X-Mock-Project-ID" header is required.');
		}

		const canView = await this.accessControlService.canViewProject(user, projectId);
		if (!canView) {
			throw new ProjectNotFoundException(projectId);
		}

		const assembledSpec = (await this.projectsService.getOpenApiSpec(
			projectId,
			user,
		)) as unknown as OpenAPIV3.Document;

		const spec = (await SwaggerParser.dereference(assembledSpec)) as OpenAPIV3.Document;

		const lowerCaseMethod = method.toLowerCase();
		const matchedOperation = this.findMatchingOperation(spec, lowerCaseMethod, path);

		if (!matchedOperation?.responses) {
			throw new MockEndpointNotFoundException(method, path);
		}

		const { response, statusCode } = this.selectResponse(
			matchedOperation.responses,
			requestedStatusCode,
		);

		if (!response) {
			throw new MockResponseNotFoundException(method, path, statusCode);
		}

		const schema = this.getSchemaFromResponse(response);

		if (!schema && statusCode.startsWith('2') && statusCode !== '204') {
			throw new MockGenerationConflictException(method, path, statusCode);
		}

		try {
			const faker = this.getFakerInstance(requestedLocale);
			JSONSchemaFaker.extend('faker', () => faker);

			const mockBody = schema ? JSONSchemaFaker.generate(schema as Schema) : null;

			return {
				body: mockBody,
				statusCode: parseInt(statusCode, 10),
			};
		} catch (error: unknown) {
			this.logger.error({ error }, 'Failed to generate mock data from schema.');
			throw new InternalServerErrorException('Could not generate mock response body.');
		}
	}

	private getFakerInstance(locale?: string): Faker {
		const selectedLocale =
			locale && Object.hasOwn(SUPPORTED_LOCALES, locale) ? SUPPORTED_LOCALES[locale] : en;

		return new Faker({ locale: [selectedLocale, en] });
	}

	private findMatchingOperation(
		spec: OpenAPIV3.Document,
		method: string,
		requestPath: string,
	): OpenAPIV3.OperationObject | null {
		if (!spec.paths) return null;

		for (const specPath of Object.keys(spec.paths)) {
			const parsablePath = specPath.replace(/{(\w+)}/g, ':$1');
			const matcher = match(parsablePath, { decode: decodeURIComponent });
			const isMatch = matcher(requestPath);

			if (isMatch) {
				const pathItem = spec.paths[specPath];
				if (!pathItem) continue;

				if (VALID_HTTP_METHODS.has(method) && method in pathItem) {
					const operation = pathItem[method as OpenAPIV3.HttpMethods];
					if (operation && '$ref' in operation) continue;
					if (operation) return operation;
				}
			}
		}

		return null;
	}

	private selectResponse(
		responses: OpenAPIV3.ResponsesObject,
		requestedStatus?: string,
	): { response: OpenAPIV3.ResponseObject | null; statusCode: string } {
		if (requestedStatus) {
			if (responses[requestedStatus]) {
				const res = responses[requestedStatus];
				if ('$ref' in res) return { response: null, statusCode: requestedStatus };
				return { response: res, statusCode: requestedStatus };
			}

			return { response: null, statusCode: requestedStatus };
		}

		const successStatus = Object.keys(responses).find(
			(code) => code.startsWith('2') && code !== '204',
		);

		if (successStatus) {
			const res = responses[successStatus];
			if ('$ref' in res) return { response: null, statusCode: successStatus };
			return { response: res, statusCode: successStatus };
		}

		if (responses['204']) {
			const res = responses['204'];
			if ('$ref' in res) return { response: null, statusCode: '204' };
			return { response: res, statusCode: '204' };
		}

		return { response: null, statusCode: '200' };
	}

	private getSchemaFromResponse(
		response: OpenAPIV3.ResponseObject,
	): OpenAPIV3.SchemaObject | null {
		const content = response.content?.['application/json']?.schema;
		if (!content) {
			return null;
		}
		return content as OpenAPIV3.SchemaObject;
	}
}
