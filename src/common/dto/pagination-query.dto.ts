import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
	@ApiPropertyOptional({
		description: 'The number of items to return.',
		default: 10,
		minimum: 1,
		maximum: 100,
	})
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	@IsOptional()
	limit = 10;

	@ApiPropertyOptional({
		description: 'The page number to return.',
		default: 1,
		minimum: 1,
	})
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@IsOptional()
	page = 1;

	get skip(): number {
		return (this.page - 1) * this.limit;
	}
}
