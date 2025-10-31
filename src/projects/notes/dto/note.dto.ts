import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { SanitizedUserDto } from 'src/users/dto/sanitized-user.dto';

export const noteDtoInclude = {
	author: {
		select: {
			id: true,
			username: true,
			profileImage: true,
		},
	},
} satisfies Prisma.NoteInclude;

const _noteDtoInternalType = { include: noteDtoInclude };
type NoteWithAuthor = Prisma.NoteGetPayload<typeof _noteDtoInternalType>;

export class NoteDto {
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

	constructor(note: NoteWithAuthor) {
		this.id = note.id;
		this.content = note.content;
		this.createdAt = note.createdAt;
		this.updatedAt = note.updatedAt;
		this.author = new SanitizedUserDto(note.author);
	}
}
