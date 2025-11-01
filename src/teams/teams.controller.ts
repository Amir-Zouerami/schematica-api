import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PaginationSearchQueryDto } from 'src/common/dto/pagination-search-query.dto';
import { PaginatedServiceResponse } from 'src/common/interfaces/api-response.interface';
import { TeamDto } from './dto/team.dto';
import { TeamsService } from './teams.service';

@ApiTags('Teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('teams')
export class TeamsController {
	constructor(private readonly teamService: TeamsService) {}

	@Get()
	@ApiOkResponse({ description: 'a list of all teams', type: [TeamDto] })
	async findAll(
		@Query() paginationQuery: PaginationSearchQueryDto,
	): Promise<PaginatedServiceResponse<TeamDto>> {
		return await this.teamService.findAllPaginated(paginationQuery);
	}
}
