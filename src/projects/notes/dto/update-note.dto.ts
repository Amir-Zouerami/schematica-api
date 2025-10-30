import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdateNoteDto {
	@ApiProperty({
		description: 'The updated content of the note.',
		example: 'This endpoint is now officially deprecated as of today.',
		minLength: 1,
	})
	@IsString()
	@IsNotEmpty()
	@MinLength(1)
	content: string;
}
