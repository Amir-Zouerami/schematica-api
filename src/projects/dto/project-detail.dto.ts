import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccessType, Prisma } from '@prisma/client';
import { TeamDto } from 'src/teams/dto/team.dto';
import { SanitizedUserDto } from 'src/users/dto/sanitized-user.dto';
import { ProjectAccessDetailsResponseDto } from './project-access-details.dto';
import { ProjectLinkDto } from './project-link.dto';
import { ProjectServerDto } from './project-server.dto';

export type ProjectDetailWithRelations = Prisma.ProjectGetPayload<{
	include: {
		creator: true;
		updatedBy: true;
		links: true;
		userAccesses: {
			include: {
				user: {
					select: { id: true; username: true; profileImage: true };
				};
			};
		};
		teamAccesses: {
			include: {
				team: true;
			};
		};
		deniedUsers: {
			select: { id: true; username: true; profileImage: true };
		};
	};
}>;

export class ProjectDetailDto {
	@ApiProperty()
	id: string;

	@ApiProperty()
	name: string;

	@ApiProperty({ nullable: true, type: String })
	description: string | null;

	@ApiProperty({ type: [ProjectServerDto], nullable: true })
	servers: ProjectServerDto[] | null;

	@ApiProperty({ type: SanitizedUserDto })
	creator: SanitizedUserDto;

	@ApiProperty({ type: SanitizedUserDto })
	updatedBy: SanitizedUserDto;

	@ApiProperty({ type: [ProjectLinkDto] })
	links: ProjectLinkDto[];

	@ApiPropertyOptional({
		description: 'The full Access Control List (ACL) for the project.',
		type: ProjectAccessDetailsResponseDto,
	})
	access?: ProjectAccessDetailsResponseDto;

	@ApiProperty()
	createdAt: Date;

	@ApiProperty()
	updatedAt: Date;

	constructor(project: ProjectDetailWithRelations) {
		this.id = project.id;
		this.name = project.name;
		this.description = project.description;
		this.servers = ProjectServerDto.fromPrisma(project.servers);
		this.createdAt = project.createdAt;
		this.updatedAt = project.updatedAt;
		this.creator = SanitizedUserDto.from(project.creator);
		this.updatedBy = SanitizedUserDto.from(project.updatedBy);
		this.links = project.links;

		if (project.userAccesses && project.teamAccesses && project.deniedUsers) {
			this.access = {
				owners: {
					users: project.userAccesses
						.filter((ua) => ua.type === AccessType.OWNER)
						.map((ua) => SanitizedUserDto.from(ua.user)),
					teams: project.teamAccesses
						.filter((ta) => ta.type === AccessType.OWNER)
						.map((ta) => TeamDto.from(ta.team)),
				},
				viewers: {
					users: project.userAccesses
						.filter((ua) => ua.type === AccessType.VIEWER)
						.map((ua) => SanitizedUserDto.from(ua.user)),
					teams: project.teamAccesses
						.filter((ta) => ta.type === AccessType.VIEWER)
						.map((ta) => TeamDto.from(ta.team)),
				},
				deniedUsers: project.deniedUsers.map((u) => SanitizedUserDto.from(u)),
			};
		}
	}
}
