import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
	ArrayMinSize,
	IsArray,
	IsNotEmpty,
	IsOptional,
	IsString,
	IsUrl,
	Validate,
	ValidateNested,
} from 'class-validator';
import { AreLinksUniqueConstraint } from '../validators/are-links-unique.validator';
import { ProjectLinkDto } from './project-link.dto';

export class CreateProjectDto {
	@ApiProperty({ example: 'Project Nova' })
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiPropertyOptional({ example: 'A test project for the UI team.' })
	@IsString()
	@IsOptional()
	@IsNotEmpty()
	description?: string;

	@ApiPropertyOptional({ example: 'https://api.test.com' })
	@IsUrl()
	@IsOptional()
	@IsNotEmpty()
	serverUrl?: string;

	@ApiPropertyOptional({ type: [ProjectLinkDto] })
	@IsArray()
	@ArrayMinSize(1, { message: 'links must contain at least one item' })
	@ValidateNested({ each: true, message: 'each link must be an object' })
	@Type(() => ProjectLinkDto)
	@Validate(AreLinksUniqueConstraint)
	@IsOptional()
	links?: ProjectLinkDto[];
}
