import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiPaginatedResponse } from 'src/common/decorators/api-paginated-response.decorator';
import { ErrorResponseDto } from 'src/common/dto/error-response.dto';
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
	@ApiPaginatedResponse(ChangelogDto)
	@ApiNotFoundResponse({
		description: 'Project not found or user lacks access.',
		type: ErrorResponseDto,
	})
	findAll(
		@Param('projectId') projectId: string,
		@Query() paginationQuery: PaginationQueryDto,
	): Promise<PaginatedServiceResponse<ChangelogDto>> {
		return this.changelogService.findAllForProject(projectId, paginationQuery);
	}
}
