import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
	IsArray,
	IsDateString,
	IsNotEmpty,
	IsOptional,
	IsString,
	ValidateNested,
} from 'class-validator';
import { ProjectAccessControlListDto } from './project-access-control-list.dto';

export class UpdateAccessDto {
	@ApiPropertyOptional({
		description: 'The users and teams who have OWNER (write) access.',
		type: ProjectAccessControlListDto,
	})
	@ValidateNested()
	@Type(() => ProjectAccessControlListDto)
	@IsOptional()
	owners: ProjectAccessControlListDto = new ProjectAccessControlListDto();

	@ApiPropertyOptional({
		description: 'The users and teams who have VIEWER (read) access.',
		type: ProjectAccessControlListDto,
	})
	@ValidateNested()
	@Type(() => ProjectAccessControlListDto)
	@IsOptional()
	viewers: ProjectAccessControlListDto = new ProjectAccessControlListDto();

	@ApiPropertyOptional({
		description:
			'A list of user IDs who are explicitly denied access, overriding any team-based access.',
		type: [String],
		example: ['3'],
	})
	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	deniedUsers: string[] = [];

	@ApiProperty({
		description:
			'The last `updatedAt` timestamp of the parent project, for optimistic concurrency control.',
		example: '2025-10-29T10:00:00.000Z',
	})
	@IsDateString()
	@IsNotEmpty()
	lastKnownUpdatedAt: string;
}
