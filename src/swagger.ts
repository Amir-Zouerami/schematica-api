import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AuditLogDto } from './audit/dto/audit-log.dto';
import { UserDto } from './auth/dto/user.dto';
import { ChangelogDto } from './changelog/dto/changelog.dto';
import { AllConfigTypes } from './config/config.type';
import { NotificationDto } from './notifications/dto/notification.dto';
import { ProjectAccessControlListDto } from './projects/dto/project-access-control-list.dto';
import {
	ProjectAccessControlListResponseDto,
	ProjectAccessDetailsResponseDto,
} from './projects/dto/project-access-details.dto';
import { ProjectDetailDto } from './projects/dto/project-detail.dto';
import { ProjectLinkDto } from './projects/dto/project-link.dto';
import { ProjectSummaryDto } from './projects/dto/project-summary.dto';
import { EndpointSummaryDto } from './projects/endpoints/dto/endpoint-summary.dto';
import { EndpointDto } from './projects/endpoints/dto/endpoint.dto';
import { OpenApiOperationDto } from './projects/endpoints/dto/openapi-operation.dto';
import { EnvironmentDto } from './projects/environments/dto/environment.dto';
import { NoteDto } from './projects/notes/dto/note.dto';
import { SchemaComponentDto } from './projects/schema-components/dto/schema-component.dto';
import { SecretDto } from './projects/secrets/dto/secret.dto';
import { TeamDto } from './teams/dto/team.dto';
import { SanitizedUserDto } from './users/dto/sanitized-user.dto';

const parameterObjectSchema = {
	type: 'object',
	properties: {
		name: { type: 'string' },
		in: { type: 'string', enum: ['query', 'header', 'path', 'cookie'] },
		description: { type: 'string' },
		required: { type: 'boolean' },
		schema: { type: 'object' },
	},
	required: ['name', 'in'],
	additionalProperties: true,
};

const requestBodyObjectSchema = {
	type: 'object',
	properties: {
		description: { type: 'string' },
		required: { type: 'boolean' },
		content: {
			type: 'object',
			additionalProperties: { type: 'object' },
		},
	},
	required: ['content'],
	additionalProperties: true,
};

const responseObjectSchema = {
	type: 'object',
	properties: {
		description: { type: 'string' },
		content: {
			type: 'object',
			additionalProperties: { type: 'object' },
		},
	},
	required: ['description'],
	additionalProperties: true,
};

const operationObjectSchema = {
	type: 'object',
	properties: {
		tags: { type: 'array', items: { type: 'string' } },
		summary: { type: 'string' },
		description: { type: 'string' },
		externalDocs: { type: 'object' },
		operationId: { type: 'string' },
		parameters: {
			type: 'array',
			items: {
				$ref: '#/components/schemas/ParameterObject',
			},
		},
		requestBody: {
			$ref: '#/components/schemas/RequestBodyObject',
		},
		responses: {
			type: 'object',
			additionalProperties: {
				$ref: '#/components/schemas/ResponseObject',
			},
		},
		callbacks: { type: 'object' },
		deprecated: { type: 'boolean' },
		security: { type: 'array', items: { type: 'object' } },
		servers: { type: 'array', items: { type: 'object' } },
	},
	additionalProperties: true, // Allows for extensions like 'x-app-metadata'
};

export function setupSwagger(app: INestApplication): void {
	const configService = app.get(ConfigService<AllConfigTypes, true>);

	const appTitle = configService.get('app.title', { infer: true });
	const appVersion = configService.get('app.version', { infer: true });
	const appTag = configService.get('app.tag', { infer: true });
	const appServerUrl = configService.get('app.serverUrl', { infer: true });
	const appDocsPath = configService.get('app.docsPath', { infer: true });
	const appDescription = configService.get('app.description', {
		infer: true,
	});

	const config = new DocumentBuilder()
		.setTitle(appTitle)
		.setDescription(appDescription)
		.setVersion(appVersion)
		.addTag(appTag)
		.addServer(appServerUrl)
		.build();

	const document = SwaggerModule.createDocument(app, config, {
		extraModels: [
			OpenApiOperationDto,
			AuditLogDto,
			UserDto,
			ChangelogDto,
			NotificationDto,
			ProjectAccessControlListDto,
			ProjectAccessDetailsResponseDto,
			ProjectAccessControlListResponseDto,
			ProjectDetailDto,
			ProjectLinkDto,
			ProjectSummaryDto,
			EndpointDto,
			EndpointSummaryDto,
			EnvironmentDto,
			NoteDto,
			SchemaComponentDto,
			SecretDto,
			TeamDto,
			SanitizedUserDto,
		],
	});

	if (document.components?.schemas) {
		document.components.schemas.OpenApiOperationDto = operationObjectSchema;
		document.components.schemas.ParameterObject = parameterObjectSchema;
		document.components.schemas.RequestBodyObject = requestBodyObjectSchema;
		document.components.schemas.ResponseObject = responseObjectSchema;
	}

	SwaggerModule.setup(appDocsPath, app, document);
}
