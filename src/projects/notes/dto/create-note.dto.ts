import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateNoteDto {
	@ApiProperty({
		description: 'The content of the note.',
		example: 'This endpoint is deprecated and will be removed in Q4.',
		minLength: 1,
	})
	@IsString()
	@IsNotEmpty()
	@MinLength(1)
	content: string;
}
