import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty } from 'class-validator';
import { CreateProjectDto } from './create-project.dto';

export class UpdateProjectDto extends CreateProjectDto {
	@ApiProperty({
		description:
			'The last `updatedAt` timestamp known by the client, for optimistic concurrency control.',
		example: '2025-10-29T10:00:00.000Z',
	})
	@IsDateString()
	@IsNotEmpty()
	lastKnownUpdatedAt: string;
}
