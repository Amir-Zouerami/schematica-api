import { ApiProperty } from '@nestjs/swagger';
import { type OpenAPIObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { IsDateString, IsNotEmpty, IsObject } from 'class-validator';

export class UpdateOpenApiSpecDto {
	@ApiProperty({
		description: 'A valid OpenAPI 3.0 specification object.',
		type: 'object',
		additionalProperties: true,
		example: {
			openapi: '3.0.0',
			info: { title: 'New Spec', version: '1.0.0' },
			paths: { '/health': { get: { responses: { '200': { description: 'OK' } } } } },
		},
	})
	@IsObject()
	spec: OpenAPIObject;

	@ApiProperty({
		description:
			'The last `updatedAt` timestamp of the parent project, for optimistic concurrency control.',
		example: '2025-10-29T10:00:00.000Z',
	})
	@IsDateString()
	@IsNotEmpty()
	lastKnownUpdatedAt: string;
}
