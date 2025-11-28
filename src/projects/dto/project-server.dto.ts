import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

function isValidServerObject(obj: unknown): obj is { url: string; description?: string } {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'url' in obj &&
		typeof (obj as Record<string, unknown>).url === 'string'
	);
}

export class ProjectServerDto {
	@ApiProperty({ example: 'https://api.production.com' })
	@IsUrl()
	@IsNotEmpty()
	url: string;

	@ApiPropertyOptional({ example: 'Production Server' })
	@IsString()
	@IsOptional()
	description?: string;

	/**
	 * Safely converts a Prisma JsonValue (which might be null, array, or object)
	 * into a typed array of ProjectServerDto instances.
	 */
	static fromPrisma(serversJson: Prisma.JsonValue): ProjectServerDto[] | null {
		if (!serversJson || !Array.isArray(serversJson) || serversJson.length === 0) {
			return null;
		}

		const dtos: ProjectServerDto[] = [];

		for (const item of serversJson) {
			if (isValidServerObject(item)) {
				const dto = new ProjectServerDto();
				dto.url = item.url;
				dto.description = item.description;
				dtos.push(dto);
			}
		}

		return dtos.length > 0 ? dtos : null;
	}
}
