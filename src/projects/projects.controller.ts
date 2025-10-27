import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
	ApiBearerAuth,
	ApiCreatedResponse,
	ApiOkResponse,
	ApiTags,
} from '@nestjs/swagger';
import { Project } from '@prisma/client';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UserDto } from 'src/auth/dto/user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PaginatedServiceResponse } from 'src/common/interfaces/api-response.interface';
import { CreateProjectDto } from './dto/create-project.dto';
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
	})
	async findAll(
		@Query() paginationQuery: PaginationQueryDto,
		@CurrentUser() user: UserDto,
	): Promise<PaginatedServiceResponse<Omit<Project, 'openApiSpec'>>> {
		return await this.projectsService.findAllForUser(user, paginationQuery);
	}
}
