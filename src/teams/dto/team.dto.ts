import { ApiProperty } from '@nestjs/swagger';
import { Team } from '@prisma/client';

export class TeamDto {
	@ApiProperty()
	id: string;

	@ApiProperty()
	name: string;

	@ApiProperty()
	createdAt: Date;

	@ApiProperty()
	updatedAt: Date;

	static from(team: Team): TeamDto {
		const dto = new TeamDto();
		dto.id = team.id;
		dto.name = team.name;
		dto.createdAt = team.createdAt;
		dto.updatedAt = team.updatedAt;
		return dto;
	}
}
