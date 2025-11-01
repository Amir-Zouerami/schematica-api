import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export class PaginationSearchQueryDto extends PaginationQueryDto {
	@ApiPropertyOptional({
		description: 'A search term to filter results by name or username.',
		example: 'amir',
		minLength: 2,
	})
	@IsString()
	@MinLength(2)
	@IsOptional()
	search?: string;
}
