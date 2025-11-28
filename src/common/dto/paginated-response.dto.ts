import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
	@ApiProperty({ example: 50, description: 'Total number of items available.' })
	total: number;

	@ApiProperty({
		example: 10,
		description: 'The number of items returned in the current response.',
	})
	limit: number;

	@ApiProperty({ example: 1, description: 'The current page number.' })
	page: number;

	@ApiProperty({ example: 5, description: 'The total number of pages available.' })
	lastPage: number;
}
