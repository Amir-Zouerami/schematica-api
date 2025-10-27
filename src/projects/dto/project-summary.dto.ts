import { ApiProperty } from '@nestjs/swagger';
import { Project } from '@prisma/client';
import { SanitizedUserDto } from 'src/users/dto/sanitized-user.dto';

export class ProjectSummaryDto implements Omit<Project, 'openApiSpec'> {
	@ApiProperty()
	id: string;

	@ApiProperty()
	name: string;

	@ApiProperty({ nullable: true })
	description: string | null;

	@ApiProperty({ nullable: true })
	serverUrl: string | null;

	@ApiProperty()
	createdAt: Date;

	@ApiProperty()
	updatedAt: Date;

	@ApiProperty()
	creatorId: string;

	@ApiProperty()
	updatedById: string;

	@ApiProperty({ type: SanitizedUserDto })
	creator: SanitizedUserDto;

	@ApiProperty({ type: SanitizedUserDto })
	updatedBy: SanitizedUserDto;
}
