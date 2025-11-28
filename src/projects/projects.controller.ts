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
	ApiBody,
	ApiConflictResponse,
	ApiCreatedResponse,
	ApiForbiddenResponse,
	ApiNoContentResponse,
	ApiNotFoundResponse,
	ApiOkResponse,
	ApiTags,
} from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UserDto } from 'src/auth/dto/user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiPaginatedResponse } from 'src/common/decorators/api-paginated-response.decorator';
import { ErrorResponseDto } from 'src/common/dto/error-response.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PaginatedServiceResponse } from 'src/common/interfaces/api-response.interface';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectDetailDto } from './dto/project-detail.dto';
import { ProjectSummaryDto } from './dto/project-summary.dto';
import { UpdateAccessDto } from './dto/update-access.dto';
import { UpdateOpenApiSpecDto } from './dto/update-openapi-spec.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectCreationGuard } from './guards/project-creation.guard';
import { ProjectOwnerGuard } from './guards/project-owner.guard';
import { ProjectsService } from './projects.service';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
	constructor(private readonly projectsService: ProjectsService) {}

	@Post()
	@UseGuards(ProjectCreationGuard)
	@ApiCreatedResponse({
		description: 'The project has been successfully created.',
		type: ProjectDetailDto,
	})
	@ApiConflictResponse({
		description: 'A project with this name already exists.',
		type: ErrorResponseDto,
	})
	@ApiForbiddenResponse({
		description: 'You do not have permission to create a new project.',
		type: ErrorResponseDto,
	})
	create(
		@Body() createProjectDto: CreateProjectDto,
		@CurrentUser() user: UserDto,
	): Promise<ProjectDetailDto> {
		return this.projectsService.create(createProjectDto, user);
	}

	@Get()
	@ApiPaginatedResponse(ProjectSummaryDto)
	findAll(
		@Query() paginationQuery: PaginationQueryDto,
		@CurrentUser() user: UserDto,
	): Promise<PaginatedServiceResponse<ProjectSummaryDto>> {
		return this.projectsService.findAllForUser(user, paginationQuery);
	}

	@Get(':projectId')
	@ApiOkResponse({
		description: 'The detailed information for a single project.',
		type: ProjectDetailDto,
	})
	@ApiNotFoundResponse({
		description: 'Project not found or user lacks access.',
		type: ErrorResponseDto,
	})
	findOne(
		@Param('projectId') projectId: string,
		@CurrentUser() user: UserDto,
	): Promise<ProjectDetailDto> {
		return this.projectsService.findOneByIdForUser(projectId, user);
	}

	@Put(':projectId')
	@UseGuards(ProjectOwnerGuard)
	@ApiOkResponse({
		description: 'Project metadata updated successfully.',
		type: ProjectDetailDto,
	})
	@ApiForbiddenResponse({
		description: 'User does not have ownership of this project.',
		type: ErrorResponseDto,
	})
	@ApiConflictResponse({
		description:
			'A project with the new name already exists, or a concurrency conflict occurred.',
		type: ErrorResponseDto,
	})
	update(
		@Param('projectId') projectId: string,
		@Body() updateProjectDto: UpdateProjectDto,
		@CurrentUser() user: UserDto,
	): Promise<ProjectDetailDto> {
		return this.projectsService.update(projectId, updateProjectDto, user);
	}

	@Delete(':projectId')
	@UseGuards(ProjectOwnerGuard)
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiNoContentResponse({ description: 'Project deleted successfully.' })
	@ApiForbiddenResponse({
		description: 'User does not have ownership of this project.',
		type: ErrorResponseDto,
	})
	@ApiNotFoundResponse({
		description: 'Project not found.',
		type: ErrorResponseDto,
	})
	async delete(
		@Param('projectId') projectId: string,
		@CurrentUser() user: UserDto,
	): Promise<void> {
		await this.projectsService.delete(projectId, user);
	}

	@Get(':projectId/openapi')
	@ApiOkResponse({
		description: 'The dynamically generated OpenAPI specification for the project.',
		content: {
			'application/json': {
				schema: {
					type: 'object',
					description: 'A valid OpenAPI 3.0 specification object.',
				},
			},
		},
	})
	@ApiNotFoundResponse({
		description: 'Project not found or user lacks access.',
		type: ErrorResponseDto,
	})
	getOpenApiSpec(
		@Param('projectId') projectId: string,
		@CurrentUser() user: UserDto,
	): Promise<Prisma.JsonValue> {
		return this.projectsService.getOpenApiSpec(projectId, user);
	}

	@Put(':projectId/openapi')
	@UseGuards(ProjectOwnerGuard)
	@ApiOkResponse({
		description:
			'The OpenAPI specification has been successfully imported and all endpoints replaced.',
		type: ProjectDetailDto,
	})
	@ApiForbiddenResponse({
		description: 'User does not have ownership of this project.',
		type: ErrorResponseDto,
	})
	@ApiConflictResponse({
		description:
			'A concurrency conflict occurred. The project has been updated by someone else.',
		type: ErrorResponseDto,
	})
	@ApiNotFoundResponse({
		description: 'Project not found.',
		type: ErrorResponseDto,
	})
	@ApiBody({ type: UpdateOpenApiSpecDto })
	importOpenApiSpec(
		@Param('projectId') projectId: string,
		@Body() updateOpenApiSpecDto: UpdateOpenApiSpecDto,
		@CurrentUser() user: UserDto,
	): Promise<ProjectDetailDto> {
		return this.projectsService.importOpenApiSpec(projectId, updateOpenApiSpecDto, user);
	}

	@Put(':projectId/access')
	@UseGuards(ProjectOwnerGuard)
	@ApiOkResponse({
		description: 'Project access control list updated successfully.',
		type: ProjectDetailDto,
	})
	@ApiForbiddenResponse({
		description: 'User does not have ownership of this project.',
		type: ErrorResponseDto,
	})
	@ApiConflictResponse({
		description: 'A concurrency conflict occurred.',
		type: ErrorResponseDto,
	})
	updateAccess(
		@Param('projectId') projectId: string,
		@Body() updateAccessDto: UpdateAccessDto,
		@CurrentUser() user: UserDto,
	): Promise<ProjectDetailDto> {
		return this.projectsService.updateAccess(projectId, updateAccessDto, user);
	}
}
