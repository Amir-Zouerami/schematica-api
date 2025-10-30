import { ApiProperty } from '@nestjs/swagger';
import { Note } from '@prisma/client';
import { SanitizedUserDto } from 'src/users/dto/sanitized-user.dto';

export class NoteDto implements Omit<Note, 'authorId' | 'endpointId'> {
	@ApiProperty()
	id: number;

	@ApiProperty()
	content: string;

	@ApiProperty()
	createdAt: Date;

	@ApiProperty()
	updatedAt: Date;

	@ApiProperty({ type: () => SanitizedUserDto })
	author: SanitizedUserDto;
}
