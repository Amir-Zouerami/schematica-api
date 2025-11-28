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
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UserDto } from 'src/auth/dto/user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ErrorResponseDto } from 'src/common/dto/error-response.dto';
import { CheckResourceRelations } from 'src/common/guards/check-resource-relations.decorator';
import { ResourceRelationsGuard } from 'src/common/guards/resource-relations.guard';
import { ProjectOwnerGuard } from '../guards/project-owner.guard';
import { ProjectViewerGuard } from '../guards/project-viewer.guard';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { EnvironmentDto } from './dto/environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';
import { EnvironmentsService } from './environments.service';

@ApiTags('Projects - Environments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/environments')
export class EnvironmentsController {
	constructor(private readonly environmentsService: EnvironmentsService) {}

	@Post()
	@UseGuards(ProjectOwnerGuard)
	@ApiCreatedResponse({
		description: 'The environment has been successfully created.',
		type: EnvironmentDto,
	})
	@ApiForbiddenResponse({
		description: 'User does not have ownership of this project.',
		type: ErrorResponseDto,
	})
	@ApiConflictResponse({
		description: 'An environment with this name already exists.',
		type: ErrorResponseDto,
	})
	create(
		@Param('projectId') projectId: string,
		@Body() createEnvironmentDto: CreateEnvironmentDto,
		@CurrentUser() user: UserDto,
	): Promise<EnvironmentDto> {
		return this.environmentsService.create(projectId, createEnvironmentDto, user);
	}

	@Get()
	@UseGuards(ProjectViewerGuard)
	@ApiOkResponse({
		description: 'A list of all environments for the project.',
		type: [EnvironmentDto],
	})
	@ApiForbiddenResponse({
		description: 'User does not have permission to view this project.',
		type: ErrorResponseDto,
	})
	findAll(@Param('projectId') projectId: string): Promise<EnvironmentDto[]> {
		return this.environmentsService.findAllForProject(projectId);
	}

	@Put(':environmentId')
	@CheckResourceRelations({
		parentModel: 'Project',
		parentParam: 'projectId',
		relationName: 'environments',
		childParam: 'environmentId',
		childModelName: 'Environment',
	})
	@UseGuards(ProjectOwnerGuard, ResourceRelationsGuard)
	@ApiOkResponse({
		description: 'The environment has been successfully updated.',
		type: EnvironmentDto,
	})
	@ApiForbiddenResponse({
		description: 'User does not have ownership of this project.',
		type: ErrorResponseDto,
	})
	@ApiNotFoundResponse({
		description: 'The specified environment was not found.',
		type: ErrorResponseDto,
	})
	@ApiConflictResponse({
		description: 'An environment with this name already exists.',
		type: ErrorResponseDto,
	})
	update(
		@Param('projectId') projectId: string,
		@Param('environmentId') environmentId: string,
		@Body() updateEnvironmentDto: UpdateEnvironmentDto,
		@CurrentUser() user: UserDto,
	): Promise<EnvironmentDto> {
		return this.environmentsService.update(
			projectId,
			environmentId,
			updateEnvironmentDto,
			user,
		);
	}

	@Delete(':environmentId')
	@CheckResourceRelations({
		parentModel: 'Project',
		parentParam: 'projectId',
		relationName: 'environments',
		childParam: 'environmentId',
		childModelName: 'Environment',
	})
	@UseGuards(ProjectOwnerGuard, ResourceRelationsGuard)
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiNoContentResponse({ description: 'The environment has been successfully deleted.' })
	@ApiForbiddenResponse({
		description: 'User does not have ownership of this project.',
		type: ErrorResponseDto,
	})
	@ApiNotFoundResponse({
		description: 'The specified environment was not found.',
		type: ErrorResponseDto,
	})
	async remove(
		@Param('projectId') projectId: string,
		@Param('environmentId') environmentId: string,
		@CurrentUser() user: UserDto,
	): Promise<void> {
		await this.environmentsService.remove(projectId, environmentId, user);
	}
}
