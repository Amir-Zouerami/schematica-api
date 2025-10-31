import { ApiProperty } from '@nestjs/swagger';
import { Prisma, ProjectLink } from '@prisma/client';
import { SanitizedUserDto } from 'src/users/dto/sanitized-user.dto';
import { ProjectLinkDto } from './project-link.dto';

export type ProjectDetailWithRelations = Prisma.ProjectGetPayload<{
	include: {
		creator: true;
		updatedBy: true;
		links: true;
	};
}>;

export class ProjectDetailDto {
	@ApiProperty()
	id: string;

	@ApiProperty()
	name: string;

	@ApiProperty({ nullable: true })
	description: string | null;

	@ApiProperty({ nullable: true })
	serverUrl: string | null;

	@ApiProperty({ type: SanitizedUserDto })
	creator: SanitizedUserDto;

	@ApiProperty({ type: SanitizedUserDto })
	updatedBy: SanitizedUserDto;

	@ApiProperty({ type: [ProjectLinkDto] })
	links: ProjectLink[];

	@ApiProperty()
	createdAt: Date;

	@ApiProperty()
	updatedAt: Date;

	constructor(project: ProjectDetailWithRelations) {
		this.id = project.id;
		this.name = project.name;
		this.description = project.description;
		this.serverUrl = project.serverUrl;
		this.createdAt = project.createdAt;
		this.updatedAt = project.updatedAt;
		this.creator = new SanitizedUserDto(project.creator);
		this.updatedBy = new SanitizedUserDto(project.updatedBy);
		this.links = project.links;
	}
}
