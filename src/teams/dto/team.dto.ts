import { ApiProperty } from '@nestjs/swagger';
import { Team } from '@prisma/client';

export class TeamDto implements Team {
	@ApiProperty()
	id: string;

	@ApiProperty()
	name: string;

	@ApiProperty()
	createdAt: Date;

	@ApiProperty()
	updatedAt: Date;

	constructor(team: Team) {
		this.id = team.id;
		this.name = team.name;
		this.createdAt = team.createdAt;
		this.updatedAt = team.updatedAt;
	}
}
