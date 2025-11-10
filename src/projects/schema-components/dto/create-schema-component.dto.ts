import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { IsNotEmpty, IsObject, IsOptional, IsString, Matches } from 'class-validator';

const COMPONENT_NAME_REGEX = /^[A-Za-z0-9_-]+$/;

export class CreateSchemaComponentDto {
	@ApiProperty({
		description: 'The unique name of the component (e.g., "User", "ErrorResponse").',
		example: 'User',
		pattern: COMPONENT_NAME_REGEX.source,
	})
	@IsString()
	@IsNotEmpty()
	@Matches(COMPONENT_NAME_REGEX, {
		message: 'Component name can only contain letters, numbers, hyphens, and underscores.',
	})
	name: string;

	@ApiPropertyOptional({
		description: 'An optional description for the component.',
		example: 'A standard user object.',
	})
	@IsString()
	@IsOptional()
	@IsNotEmpty()
	description?: string;

	@ApiProperty({
		description: 'A valid OpenAPI Schema Object.',
		type: 'object',
		additionalProperties: true,
		example: {
			type: 'object',
			properties: {
				id: { type: 'string', format: 'uuid' },
				email: { type: 'string', format: 'email' },
			},
			required: ['id', 'email'],
		},
	})
	@IsObject()
	schema: SchemaObject;
}
