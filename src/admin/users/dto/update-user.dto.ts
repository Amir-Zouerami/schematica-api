import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
	@ApiProperty({ enum: Role, enumName: 'Role', example: Role.admin })
	@IsEnum(Role)
	role: Role;

	@ApiPropertyOptional({
		description:
			'The complete new set of team IDs (lowercase team names) for the user. An empty array will remove all team memberships.',
		type: [String],
		example: ['leadership'],
	})
	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	teams?: string[];

	@ApiPropertyOptional({
		description:
			"Optionally set a new password for the user. This will invalidate the user's existing sessions.",
		example: 'NewP@ssword123!',
		minLength: 8,
	})
	@IsString()
	@MinLength(8, { message: 'Password must be at least 8 characters long' })
	@IsOptional()
	password?: string;
}
