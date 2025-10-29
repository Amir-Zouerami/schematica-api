import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
	IsArray,
	IsDateString,
	IsNotEmpty,
	IsOptional,
	IsString,
	IsUrl,
	Validate,
	ValidateNested,
} from 'class-validator';
import { AreLinksUniqueConstraint } from '../validators/are-links-unique.validator';
import { ProjectLinkDto } from './project-link.dto';

export class UpdateProjectDto {
	@ApiProperty({
		description: "The project's new name.",
		example: 'Project Nova v2',
	})
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiPropertyOptional({ description: "The project's new description." })
	@IsString()
	@IsOptional()
	@IsNotEmpty()
	description?: string;

	@ApiPropertyOptional({
		description: 'The new base URL for the API server.',
	})
	@IsUrl()
	@IsOptional()
	serverUrl?: string;

	@ApiPropertyOptional({
		description:
			'The complete new set of related links for the project. An empty array will remove all links.',
		type: [ProjectLinkDto],
	})
	@IsArray()
	@ValidateNested({ each: true, message: 'each link must be an object' })
	@Type(() => ProjectLinkDto)
	@Validate(AreLinksUniqueConstraint)
	@IsOptional()
	links?: ProjectLinkDto[];

	@ApiProperty({
		description:
			'The last `updatedAt` timestamp known by the client, for optimistic concurrency control.',
		example: '2025-10-29T10:00:00.000Z',
	})
	@IsDateString()
	@IsNotEmpty()
	lastKnownUpdatedAt: string;
}
