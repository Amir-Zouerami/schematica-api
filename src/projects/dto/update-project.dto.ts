import { ApiProperty } from '@nestjs/swagger';
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
	@ApiProperty({ description: "The project's new name." })
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiProperty({
		description: "The project's new description.",
		required: false,
	})
	@IsString()
	@IsOptional()
	description?: string;

	@ApiProperty({
		description: 'The new base URL for the API server.',
		required: false,
	})
	@IsUrl()
	@IsOptional()
	serverUrl?: string;

	@ApiProperty({
		description: 'The complete new set of related links for the project.',
		type: [ProjectLinkDto],
		required: false,
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
		required: true,
	})
	@IsDateString()
	@IsNotEmpty()
	lastKnownUpdatedAt: string;
}
