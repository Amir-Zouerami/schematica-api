import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdateTeamDto {
	@ApiProperty({
		description: "The team's new name.",
		example: 'UI Engineering',
		minLength: 2,
	})
	@IsString()
	@IsNotEmpty()
	@MinLength(2)
	name: string;
}
