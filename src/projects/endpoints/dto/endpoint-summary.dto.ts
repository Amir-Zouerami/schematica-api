import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EndpointStatus, Prisma } from '@prisma/client';
import { OpenAPIV3 } from 'openapi-types';

function isJsonObject(value: Prisma.JsonValue): value is Prisma.JsonObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

type EndpointSummaryData = Pick<
	Prisma.EndpointGetPayload<{
		select: { id: true; path: true; method: true; operation: true; status: true };
	}>,
	'id' | 'path' | 'method' | 'operation' | 'status'
>;

export class EndpointSummaryDto {
	@ApiProperty()
	id: string;

	@ApiProperty({ example: '/users/{id}' })
	path: string;

	@ApiProperty({ example: 'get' })
	method: string;

	@ApiProperty({ enum: EndpointStatus, example: EndpointStatus.DRAFT })
	status: EndpointStatus;

	@ApiPropertyOptional({
		description: 'A short summary of what the endpoint does.',
		example: 'Get a specific user',
	})
	summary?: string;

	@ApiPropertyOptional({
		description: 'A list of tags for grouping endpoints.',
		example: ['Users'],
		type: [String],
	})
	tags?: string[];

	constructor(endpoint: EndpointSummaryData) {
		this.id = endpoint.id;
		this.path = endpoint.path;
		this.method = endpoint.method;
		this.status = endpoint.status;

		if (isJsonObject(endpoint.operation)) {
			const operation = endpoint.operation as unknown as OpenAPIV3.OperationObject;

			this.summary = operation.summary;
			this.tags = operation.tags;
		}
	}
}
