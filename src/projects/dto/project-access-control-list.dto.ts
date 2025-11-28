import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class ProjectAccessControlListDto {
	@ApiPropertyOptional({
		description: 'A list of user IDs.',
		type: [String],
		example: ['1', '2'],
	})
	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	users: string[] = [];

	@ApiPropertyOptional({
		description: 'A list of team IDs.',
		type: [String],
		example: ['backend', 'ui'],
	})
	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	teams: string[] = [];
}
