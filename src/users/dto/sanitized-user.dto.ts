import { ApiProperty } from '@nestjs/swagger';
import { SanitizedUser } from '../users.types';

export class SanitizedUserDto {
	@ApiProperty()
	id: string;

	@ApiProperty()
	username: string;

	@ApiProperty({ nullable: true, type: String })
	profileImage: string | null;

	static from(user: SanitizedUser): SanitizedUserDto {
		const dto = new SanitizedUserDto();
		dto.id = user.id;
		dto.username = user.username;
		dto.profileImage = user.profileImage ?? null;
		return dto;
	}
}
