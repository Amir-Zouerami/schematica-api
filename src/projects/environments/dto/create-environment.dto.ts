import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateEnvironmentDto {
	@ApiProperty({
		description: 'The name of the environment (e.g., "Production", "Staging").',
		example: 'Production',
	})
	@IsString()
	@IsNotEmpty()
	@MinLength(2)
	name: string;

	@ApiPropertyOptional({
		description: 'An optional description for the environment.',
		example: 'The primary production environment.',
	})
	@IsString()
	@IsOptional()
	@IsNotEmpty()
	description?: string;
}
