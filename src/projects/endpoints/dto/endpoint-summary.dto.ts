import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EndpointSummaryDto {
	@ApiProperty()
	id: string;

	@ApiProperty({ example: '/users/{id}' })
	path: string;

	@ApiProperty({ example: 'get' })
	method: string;

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
}
