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
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserDto } from 'src/auth/dto/user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ErrorResponseDto } from 'src/common/dto/error-response.dto';
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
	@ApiForbiddenResponse({
		description: 'User does not have admin privileges.',
		type: ErrorResponseDto,
	})
	@ApiConflictResponse({
		description: 'A team with this name already exists.',
		type: ErrorResponseDto,
	})
	create(@Body() createTeamDto: CreateTeamDto, @CurrentUser() user: UserDto): Promise<TeamDto> {
		return this.adminTeamsService.create(createTeamDto, user);
	}

	@Put(':teamId')
	@ApiOkResponse({ description: 'The team has been successfully updated.', type: TeamDto })
	@ApiForbiddenResponse({
		description: 'User does not have admin privileges.',
		type: ErrorResponseDto,
	})
	@ApiNotFoundResponse({
		description: 'The specified team was not found.',
		type: ErrorResponseDto,
	})
	@ApiConflictResponse({
		description: 'A team with the new name already exists.',
		type: ErrorResponseDto,
	})
	update(
		@Param('teamId') teamId: string,
		@Body() updateTeamDto: UpdateTeamDto,
		@CurrentUser() user: UserDto,
	): Promise<TeamDto> {
		return this.adminTeamsService.update(teamId, updateTeamDto, user);
	}

	@Delete(':teamId')
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiNoContentResponse({ description: 'The team has been successfully deleted.' })
	@ApiForbiddenResponse({
		description: 'User does not have admin privileges.',
		type: ErrorResponseDto,
	})
	@ApiNotFoundResponse({
		description: 'The specified team was not found.',
		type: ErrorResponseDto,
	})
	async remove(@Param('teamId') teamId: string, @CurrentUser() user: UserDto): Promise<void> {
		await this.adminTeamsService.remove(teamId, user);
	}
}
