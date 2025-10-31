import { ApiProperty } from '@nestjs/swagger';
import { SanitizedUser } from '../users.types';

export class SanitizedUserDto implements SanitizedUser {
	@ApiProperty()
	id: string;

	@ApiProperty()
	username: string;

	@ApiProperty({ nullable: true })
	profileImage: string | null;

	constructor(user: SanitizedUser) {
		this.id = user.id;
		this.username = user.username;
		this.profileImage = user.profileImage;
	}
}
