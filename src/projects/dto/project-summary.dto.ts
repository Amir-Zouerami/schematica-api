import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { SanitizedUserDto } from 'src/users/dto/sanitized-user.dto';

type ProjectSummaryWithUsers = Prisma.ProjectGetPayload<{
	include: {
		creator: true;
		updatedBy: true;
	};
}>;

export class ProjectSummaryDto {
	@ApiProperty()
	id: string;

	@ApiProperty()
	name: string;

	@ApiProperty({ nullable: true })
	description: string | null;

	@ApiProperty()
	createdAt: Date;

	@ApiProperty()
	updatedAt: Date;

	@ApiProperty({ type: SanitizedUserDto })
	creator: SanitizedUserDto;

	@ApiProperty({ type: SanitizedUserDto })
	updatedBy: SanitizedUserDto;

	constructor(project: ProjectSummaryWithUsers) {
		this.id = project.id;
		this.name = project.name;
		this.description = project.description;
		this.createdAt = project.createdAt;
		this.updatedAt = project.updatedAt;
		this.creator = new SanitizedUserDto(project.creator);
		this.updatedBy = new SanitizedUserDto(project.updatedBy);
	}
}
