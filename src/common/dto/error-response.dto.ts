import { ApiProperty } from '@nestjs/swagger';
import { RequestMeta } from '../interfaces/api-response.interface';

/**
 * Describes the structure of the `error` object in a failed API response.
 */
class ErrorPayloadDto {
	@ApiProperty({ example: 404 })
	statusCode: number;

	@ApiProperty({
		example: 'Project not found or user lacks access.',
		oneOf: [{ type: 'string' }, { type: 'object' }],
	})
	message: string | object;

	@ApiProperty({ example: 'Not Found' })
	type: string;
}

/**
 * Describes the full standard error response body for the API.
 */
export class ErrorResponseDto {
	@ApiProperty({ type: ErrorPayloadDto, nullable: true })
	error: ErrorPayloadDto | null;

	@ApiProperty({
		type: 'object',
		nullable: true,
		description: 'The data payload, which is always null for an error response.',
		additionalProperties: true,
		default: null,
	})
	data: object | null;

	@ApiProperty()
	meta: RequestMeta;
}
