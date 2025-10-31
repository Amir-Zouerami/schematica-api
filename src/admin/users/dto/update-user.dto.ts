import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
	@ApiProperty({ enum: Role, example: Role.admin })
	@IsEnum(Role)
	role: Role;

	@ApiPropertyOptional({
		description:
			'The complete new set of team IDs for the user. An empty array will remove all team memberships.',
		type: [String],
		example: ['leadership'],
	})
	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	teams?: string[];
}
