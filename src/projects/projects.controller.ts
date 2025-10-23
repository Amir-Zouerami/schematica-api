import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { Project } from '@prisma/client';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UserDto } from 'src/auth/dto/user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
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
}
