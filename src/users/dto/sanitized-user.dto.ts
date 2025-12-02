import { ApiProperty } from '@nestjs/swagger';
import { SanitizedUser } from '../users.types';

export class SanitizedUserDto {
	@ApiProperty({ example: 'clq3...' })
	id: string;

	@ApiProperty({ example: 'amir.zouerami' })
	username: string;

	@ApiProperty({ nullable: true, type: String, example: '/uploads/avatars/1.png' })
	profileImage: string | null;

	@ApiProperty({
		description:
			'Indicates if the user has been soft-deleted. Deleted users should be displayed with a visual indicator.',
		example: false,
	})
	isDeleted: boolean;

	static from(user: SanitizedUser & { deletedAt?: Date | null }): SanitizedUserDto {
		const dto = new SanitizedUserDto();
		dto.id = user.id;
		dto.username = user.username;
		dto.profileImage = user.profileImage ?? null;
		dto.isDeleted = !!user.deletedAt;
		return dto;
	}
}
