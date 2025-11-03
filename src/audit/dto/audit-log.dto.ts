import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { SanitizedUserDto } from 'src/users/dto/sanitized-user.dto';

const _auditLogWithActor = Prisma.validator<Prisma.AuditLogDefaultArgs>()({
	include: { actor: true },
});

type AuditLogWithActor = Prisma.AuditLogGetPayload<typeof _auditLogWithActor>;

export class AuditLogDto {
	@ApiProperty()
	id: number;

	@ApiProperty({ example: 'PROJECT_CREATED' })
	action: string;

	@ApiProperty()
	targetId: string;

	@ApiProperty({ nullable: true })
	details: Prisma.JsonValue | null;

	@ApiProperty()
	createdAt: Date;

	@ApiProperty({ type: () => SanitizedUserDto, nullable: true })
	actor: SanitizedUserDto | null;

	constructor(log: AuditLogWithActor) {
		this.id = log.id;
		this.action = log.action;
		this.targetId = log.targetId;
		this.details = log.details;
		this.createdAt = log.createdAt;
		this.actor = log.actor ? new SanitizedUserDto(log.actor) : null;
	}
}
