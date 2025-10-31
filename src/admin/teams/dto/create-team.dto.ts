import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateTeamDto {
	@ApiProperty({
		description: 'The name of the new team.',
		example: 'Frontend Developers',
		minLength: 2,
	})
	@IsString()
	@IsNotEmpty()
	@MinLength(2)
	name: string;
}
