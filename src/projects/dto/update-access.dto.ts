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

class AccessUserValidationDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	id: string;

	@ApiPropertyOptional()
	@IsString()
	@IsOptional()
	username?: string;

	@ApiPropertyOptional({ type: String })
	@IsOptional()
	profileImage?: string | null;
}

class AccessTeamValidationDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	id: string;

	@ApiPropertyOptional()
	@IsString()
	@IsOptional()
	name?: string;

	@ApiPropertyOptional({ type: String })
	@IsOptional()
	createdAt?: Date | string;

	@ApiPropertyOptional({ type: String })
	@IsOptional()
	updatedAt?: Date | string;
}

class ProjectAccessControlListInputDto {
	@ApiPropertyOptional({ type: [AccessUserValidationDto] })
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => AccessUserValidationDto)
	@IsOptional()
	users?: AccessUserValidationDto[];

	@ApiPropertyOptional({ type: [AccessTeamValidationDto] })
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => AccessTeamValidationDto)
	@IsOptional()
	teams?: AccessTeamValidationDto[];
}

export class UpdateAccessDto {
	@ApiPropertyOptional({ type: ProjectAccessControlListInputDto })
	@ValidateNested()
	@Type(() => ProjectAccessControlListInputDto)
	@IsOptional()
	owners?: ProjectAccessControlListInputDto;

	@ApiPropertyOptional({ type: ProjectAccessControlListInputDto })
	@ValidateNested()
	@Type(() => ProjectAccessControlListInputDto)
	@IsOptional()
	viewers?: ProjectAccessControlListInputDto;

	@ApiPropertyOptional({ type: [AccessUserValidationDto] })
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => AccessUserValidationDto)
	@IsOptional()
	deniedUsers?: AccessUserValidationDto[];

	@ApiProperty()
	@IsDateString()
	@IsNotEmpty()
	lastKnownUpdatedAt: string;
}
