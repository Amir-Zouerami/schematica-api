import { ApiProperty } from '@nestjs/swagger';

export class LockDto {
	@ApiProperty({ description: 'The ID of the user who holds the lock.', example: '1' })
	userId: string;

	@ApiProperty({
		description: 'The username of the user who holds the lock.',
		example: 'amir.zouerami',
	})
	username: string;

	@ApiProperty({
		description: 'The ISO 8601 timestamp when the lock expires.',
		example: '2025-11-06T12:00:00.000Z',
	})
	expiresAt: string;
}
