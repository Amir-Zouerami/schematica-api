import { ApiProperty } from '@nestjs/swagger';
import { Project, ProjectLink } from '@prisma/client';
import { SanitizedUserDto } from 'src/users/dto/sanitized-user.dto';
import { ProjectLinkDto } from './project-link.dto';

export class ProjectDetailDto
	implements
		Omit<
			Project,
			'openApiSpec' | 'creatorId' | 'updatedById' | 'nameNormalized'
		>
{
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
}
