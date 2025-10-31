import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccessType, Prisma, ProjectLink } from '@prisma/client';
import { SanitizedUserDto } from 'src/users/dto/sanitized-user.dto';
import { ProjectAccessControlListDto } from './project-access-control-list.dto';
import { ProjectLinkDto } from './project-link.dto';

export type ProjectDetailWithRelations = Prisma.ProjectGetPayload<{
	include: {
		creator: true;
		updatedBy: true;
		links: true;
		userAccesses: { select: { userId: true; type: true } };
		teamAccesses: { select: { teamId: true; type: true } };
		deniedUsers: { select: { id: true } };
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

	@ApiPropertyOptional({
		description: 'The full Access Control List (ACL) for the project.',
	})
	access?: {
		owners: ProjectAccessControlListDto;
		viewers: ProjectAccessControlListDto;
		deniedUsers: string[];
	};

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

		if (project.userAccesses && project.teamAccesses && project.deniedUsers) {
			this.access = {
				owners: {
					users: project.userAccesses
						.filter((ua) => ua.type === AccessType.OWNER)
						.map((ua) => ua.userId),
					teams: project.teamAccesses
						.filter((ta) => ta.type === AccessType.OWNER)
						.map((ta) => ta.teamId),
				},
				viewers: {
					users: project.userAccesses
						.filter((ua) => ua.type === AccessType.VIEWER)
						.map((ua) => ua.userId),
					teams: project.teamAccesses
						.filter((ta) => ta.type === AccessType.VIEWER)
						.map((ta) => ta.teamId),
				},
				deniedUsers: project.deniedUsers.map((u) => u.id),
			};
		}
	}
}
