import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
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

class ServerDto {
	@ApiProperty({ example: 'https://api.test.com' })
	@IsUrl()
	@IsNotEmpty()
	url: string;

	@ApiPropertyOptional({ example: 'Production Server' })
	@IsString()
	@IsOptional()
	description?: string;
}

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

	@ApiPropertyOptional({ type: [ServerDto] })
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => ServerDto)
	@IsOptional()
	servers?: ServerDto[];

	@ApiPropertyOptional({ type: [ProjectLinkDto] })
	@IsArray()
	@ValidateNested({ each: true, message: 'each link must be an object' })
	@Type(() => ProjectLinkDto)
	@Validate(AreLinksUniqueConstraint)
	@IsOptional()
	links?: ProjectLinkDto[];
}
