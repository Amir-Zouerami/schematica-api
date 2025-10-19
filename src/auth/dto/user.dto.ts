import { ApiProperty } from '@nestjs/swagger';
import { Role, type User } from '@prisma/client';

export class UserDto {
	@ApiProperty()
	id: string;

	@ApiProperty()
	username: string;

	@ApiProperty({ enum: Role })
	role: Role;

	@ApiProperty({ required: false, nullable: true })
	profileImage: string | null;

	tokenVersion: number;

	@ApiProperty()
	createdAt: Date;

	@ApiProperty()
	updatedAt: Date;

	constructor(user: User) {
		this.id = user.id;
		this.username = user.username;
		this.role = user.role;
		this.profileImage = user.profileImage;
		this.createdAt = user.createdAt;
		this.updatedAt = user.updatedAt;
	}
}
