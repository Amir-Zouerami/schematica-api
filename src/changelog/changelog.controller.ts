import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PaginatedServiceResponse } from 'src/common/interfaces/api-response.interface';
import { ProjectViewerGuard } from 'src/projects/guards/project-viewer.guard';
import { ChangelogService } from './changelog.service';
import { ChangelogDto } from './dto/changelog.dto';

@ApiTags('Projects - Changelog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/changelog')
export class ChangelogController {
	constructor(private readonly changelogService: ChangelogService) {}

	@Get()
	@UseGuards(ProjectViewerGuard)
	@ApiOkResponse({
		description: 'A paginated list of changelog entries for the project.',
		type: [ChangelogDto],
	})
	@ApiNotFoundResponse({
		description: 'Project not found or user lacks access.',
	})
	findAll(
		@Param('projectId') projectId: string,
		@Query() paginationQuery: PaginationQueryDto,
	): Promise<PaginatedServiceResponse<ChangelogDto>> {
		return this.changelogService.findAllForProject(projectId, paginationQuery);
	}
}
