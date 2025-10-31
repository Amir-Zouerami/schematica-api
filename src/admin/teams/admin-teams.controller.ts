import {
	Body,
	Controller,
	Delete,
	HttpCode,
	HttpStatus,
	Param,
	Post,
	Put,
	UseGuards,
} from '@nestjs/common';
import {
	ApiBearerAuth,
	ApiConflictResponse,
	ApiCreatedResponse,
	ApiForbiddenResponse,
	ApiNoContentResponse,
	ApiNotFoundResponse,
	ApiOkResponse,
	ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { TeamDto } from 'src/teams/dto/team.dto';
import { AdminTeamsService } from './admin-teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@ApiTags('Admin - Teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin)
@Controller('admin/teams')
export class AdminTeamsController {
	constructor(private readonly adminTeamsService: AdminTeamsService) {}

	@Post()
	@ApiCreatedResponse({ description: 'The team has been successfully created.', type: TeamDto })
	@ApiForbiddenResponse({ description: 'User does not have admin privileges.' })
	@ApiConflictResponse({ description: 'A team with this name already exists.' })
	create(@Body() createTeamDto: CreateTeamDto): Promise<TeamDto> {
		return this.adminTeamsService.create(createTeamDto);
	}

	@Put(':teamId')
	@ApiOkResponse({ description: 'The team has been successfully updated.', type: TeamDto })
	@ApiForbiddenResponse({ description: 'User does not have admin privileges.' })
	@ApiNotFoundResponse({ description: 'The specified team was not found.' })
	@ApiConflictResponse({ description: 'A team with the new name already exists.' })
	update(
		@Param('teamId') teamId: string,
		@Body() updateTeamDto: UpdateTeamDto,
	): Promise<TeamDto> {
		return this.adminTeamsService.update(teamId, updateTeamDto);
	}

	@Delete(':teamId')
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiNoContentResponse({ description: 'The team has been successfully deleted.' })
	@ApiForbiddenResponse({ description: 'User does not have admin privileges.' })
	@ApiNotFoundResponse({ description: 'The specified team was not found.' })
	async remove(@Param('teamId') teamId: string): Promise<void> {
		await this.adminTeamsService.remove(teamId);
	}
}
