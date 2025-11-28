import { ApiProperty } from '@nestjs/swagger';
import { TeamDto } from 'src/teams/dto/team.dto';
import { SanitizedUserDto } from 'src/users/dto/sanitized-user.dto';

export class ProjectAccessControlListResponseDto {
	@ApiProperty({
		type: [SanitizedUserDto],
		description: 'List of users granted this access level.',
	})
	users: SanitizedUserDto[];

	@ApiProperty({
		type: [TeamDto],
		description: 'List of teams granted this access level.',
	})
	teams: TeamDto[];
}

export class ProjectAccessDetailsResponseDto {
	@ApiProperty({
		type: ProjectAccessControlListResponseDto,
		description: 'Users and Teams with Owner (Write) access.',
	})
	owners: ProjectAccessControlListResponseDto;

	@ApiProperty({
		type: ProjectAccessControlListResponseDto,
		description: 'Users and Teams with Viewer (Read-only) access.',
	})
	viewers: ProjectAccessControlListResponseDto;

	@ApiProperty({
		type: [SanitizedUserDto],
		description: 'Users explicitly denied access, overriding team membership.',
	})
	deniedUsers: SanitizedUserDto[];
}
