import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiPaginatedResponse } from 'src/common/decorators/api-paginated-response.decorator';
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
	@ApiPaginatedResponse(TeamDto)
	async findAll(
		@Query() paginationQuery: PaginationSearchQueryDto,
	): Promise<PaginatedServiceResponse<TeamDto>> {
		return await this.teamService.findAllPaginated(paginationQuery);
	}
}
