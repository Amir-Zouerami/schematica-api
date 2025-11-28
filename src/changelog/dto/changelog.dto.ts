import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { SanitizedUserDto } from 'src/users/dto/sanitized-user.dto';

const _changelogWithActor = Prisma.validator<Prisma.ChangelogDefaultArgs>()({
	include: { actor: true },
});

type ChangelogWithActor = Prisma.ChangelogGetPayload<typeof _changelogWithActor>;

export class ChangelogDto {
	@ApiProperty()
	id: number;

	@ApiProperty({ example: "User 'amir.zouerami' added endpoint GET /users." })
	message: string;

	@ApiProperty()
	createdAt: Date;

	@ApiProperty({ type: () => SanitizedUserDto, nullable: true })
	actor: SanitizedUserDto | null;

	constructor(changelog: ChangelogWithActor) {
		this.id = changelog.id;
		this.message = changelog.message;
		this.createdAt = changelog.createdAt;
		this.actor = changelog.actor ? SanitizedUserDto.from(changelog.actor) : null;
	}
}
