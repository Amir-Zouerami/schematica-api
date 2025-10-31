import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
	@ApiProperty({ example: 'jane.doe' })
	@IsString()
	@IsNotEmpty()
	username: string;

	@ApiProperty({ minLength: 8, example: 'Str0ngP@ssw0rd!' })
	@IsString()
	@MinLength(8, { message: 'Password must be at least 8 characters long' })
	password: string;

	@ApiProperty({ enum: Role, example: Role.member })
	@IsEnum(Role)
	role: Role;

	@ApiPropertyOptional({
		description: 'A list of team IDs (which are the lowercase team names).',
		type: [String],
		example: ['backend', 'ui'],
	})
	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	teams?: string[];
}
