import { ApiProperty } from '@nestjs/swagger';
import { UserWithTeams } from 'src/users/users.types';
import { UserDto } from './user.dto';

type UserForMeDto = UserWithTeams & { hasPassword: boolean };

export class MeDto extends UserDto {
	@ApiProperty({
		description:
			'Indicates whether the user has a password set (i.e., can use local login). Is `false` for users created via OAuth who have not set a password yet.',
	})
	hasPassword: boolean;

	constructor(user: UserForMeDto) {
		super(user);
		this.hasPassword = user.hasPassword;
	}
}
