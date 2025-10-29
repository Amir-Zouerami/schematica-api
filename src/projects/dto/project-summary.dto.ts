import { ApiProperty } from '@nestjs/swagger';
import { Project } from '@prisma/client';
import { SanitizedUserDto } from 'src/users/dto/sanitized-user.dto';

export class ProjectSummaryDto
	implements
		Omit<Project, 'openApiSpec' | 'serverUrl' | 'creatorId' | 'updatedById' | 'nameNormalized'>
{
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
}
