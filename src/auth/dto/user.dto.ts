import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { TeamDto } from 'src/teams/dto/team.dto';
import { UserWithTeams } from 'src/users/users.types';

export class UserDto {
	@ApiProperty()
	id: string;

	@ApiProperty()
	username: string;

	@ApiProperty({ enum: Role })
	role: Role;

	@ApiProperty({ required: false, nullable: true, type: 'string' })
	profileImage: string | null;

	@ApiProperty({ required: false, type: () => [TeamDto] })
	teams?: TeamDto[];

	tokenVersion: number;

	@ApiProperty()
	createdAt: Date;

	@ApiProperty()
	updatedAt: Date;

	constructor(user: UserWithTeams) {
		this.id = user.id;
		this.username = user.username;
		this.role = user.role;
		this.profileImage = user.profileImage;
		this.tokenVersion = user.tokenVersion;
		this.createdAt = user.createdAt;
		this.updatedAt = user.updatedAt;
		this.teams = user.teams.map((team) => TeamDto.from(team));
	}
}
