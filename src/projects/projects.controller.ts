import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Post,
	Put,
	Query,
	UseGuards,
} from '@nestjs/common';
import {
	ApiBearerAuth,
	ApiCreatedResponse,
	ApiForbiddenResponse,
	ApiNoContentResponse,
	ApiNotFoundResponse,
	ApiOkResponse,
	ApiTags,
} from '@nestjs/swagger';
import { Prisma, Project } from '@prisma/client';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UserDto } from 'src/auth/dto/user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PaginatedServiceResponse } from 'src/common/interfaces/api-response.interface';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectDetailDto } from './dto/project-detail.dto';
import { ProjectSummaryDto } from './dto/project-summary.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectOwnerGuard } from './guards/project-owner.guard';
import { ProjectsService } from './projects.service';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
	constructor(private readonly projectsService: ProjectsService) {}

	@Post()
	@ApiCreatedResponse({
		description: 'The project has been successfully created.',
	})
	async create(
		@Body() createProjectDto: CreateProjectDto,
		@CurrentUser() user: UserDto,
	): Promise<Project> {
		return await this.projectsService.create(createProjectDto, user);
	}

	@Get()
	@ApiOkResponse({
		description: 'A paginated list of projects visible to the user.',
		type: ProjectSummaryDto,
	})
	async findAll(
		@Query() paginationQuery: PaginationQueryDto,
		@CurrentUser() user: UserDto,
	): Promise<PaginatedServiceResponse<ProjectSummaryDto>> {
		return await this.projectsService.findAllForUser(user, paginationQuery);
	}

	@Get(':projectId')
	@ApiOkResponse({
		description: 'The detailed information for a single project.',
		type: ProjectDetailDto,
	})
	@ApiNotFoundResponse({
		description: 'Project not found or user lacks access.',
	})
	async findOne(
		@Param('projectId') projectId: string,
		@CurrentUser() user: UserDto,
	) {
		return await this.projectsService.findOneByIdForUser(projectId, user);
	}

	@Get(':projectId/openapi')
	@ApiOkResponse({
		description: 'The OpenAPI specification for the project.',
	})
	@ApiNotFoundResponse({
		description: 'Project not found or user lacks access.',
	})
	async findSpec(
		@Param('projectId') projectId: string,
		@CurrentUser() user: UserDto,
	): Promise<{ openApiSpec: Prisma.JsonValue }> {
		return await this.projectsService.findSpecByIdForUser(projectId, user);
	}

	@Put(':projectId')
	@UseGuards(ProjectOwnerGuard)
	@ApiOkResponse({
		description: 'Project metadata updated successfully.',
		type: ProjectDetailDto,
	})
	@ApiForbiddenResponse({
		description: 'User does not have ownership of this project.',
	})
	async update(
		@Param('projectId') projectId: string,
		@Body() updateProjectDto: UpdateProjectDto,
		@CurrentUser() user: UserDto,
	): Promise<ProjectDetailDto> {
		return await this.projectsService.update(
			projectId,
			updateProjectDto,
			user,
		);
	}

	@Delete(':projectId')
	@UseGuards(ProjectOwnerGuard)
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiNoContentResponse({ description: 'Project deleted successfully.' })
	@ApiForbiddenResponse({
		description: 'User does not have ownership of this project.',
	})
	@ApiNotFoundResponse({ description: 'Project not found.' })
	async delete(@Param('projectId') projectId: string): Promise<void> {
		return await this.projectsService.delete(projectId);
	}
}
