import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Team } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PaginatedServiceResponse } from 'src/common/interfaces/api-response.interface';
import { TeamsService } from './teams.service';

@ApiTags('Teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('teams')
export class TeamsController {
	constructor(private readonly teamService: TeamsService) {}

	@Get()
	@ApiOkResponse({ description: 'a list of all teams' })
	async findAll(
		@Query() paginationQuery: PaginationQueryDto,
	): Promise<PaginatedServiceResponse<Team>> {
		return await this.teamService.findAllPaginated(paginationQuery);
	}
}
