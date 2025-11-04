import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
	IsArray,
	IsEnum,
	IsNotEmpty,
	IsOptional,
	IsString,
	Matches,
	MinLength,
} from 'class-validator';
import {
	USERNAME_REGEX,
	USERNAME_VALIDATION_MESSAGE,
} from 'src/common/constants/validation.constants';

export class CreateUserDto {
	@ApiProperty({
		example: 'jane.doe',
		pattern: USERNAME_REGEX.source,
	})
	@IsString()
	@IsNotEmpty()
	@Matches(USERNAME_REGEX, { message: USERNAME_VALIDATION_MESSAGE })
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
