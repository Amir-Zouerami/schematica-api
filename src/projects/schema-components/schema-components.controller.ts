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
import { ProjectOwnerGuard } from '../guards/project-owner.guard';
import { ProjectViewerGuard } from '../guards/project-viewer.guard';
import { CreateSchemaComponentDto } from './dto/create-schema-component.dto';
import { SchemaComponentDto } from './dto/schema-component.dto';
import { UpdateSchemaComponentDto } from './dto/update-schema-component.dto';
import { SchemaComponentsService } from './schema-components.service';

@ApiTags('Projects - Schema Components')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/schemas')
export class SchemaComponentsController {
	constructor(private readonly schemaComponentsService: SchemaComponentsService) {}

	@Post()
	@UseGuards(ProjectOwnerGuard)
	@ApiCreatedResponse({
		description: 'The schema component has been successfully created.',
		type: SchemaComponentDto,
	})
	@ApiForbiddenResponse({ description: 'User does not have ownership of this project.' })
	@ApiConflictResponse({ description: 'A schema component with this name already exists.' })
	create(
		@Param('projectId') projectId: string,
		@Body() createDto: CreateSchemaComponentDto,
		@CurrentUser() user: UserDto,
	): Promise<SchemaComponentDto> {
		return this.schemaComponentsService.create(projectId, createDto, user);
	}

	@Get()
	@UseGuards(ProjectViewerGuard)
	@ApiOkResponse({
		description: 'A list of all schema components for the project.',
		type: [SchemaComponentDto],
	})
	@ApiForbiddenResponse({ description: 'User does not have permission to view this project.' })
	findAll(@Param('projectId') projectId: string): Promise<SchemaComponentDto[]> {
		return this.schemaComponentsService.findAllForProject(projectId);
	}

	@Get(':name')
	@UseGuards(ProjectViewerGuard)
	@ApiOkResponse({
		description: 'The details of a single schema component.',
		type: SchemaComponentDto,
	})
	@ApiForbiddenResponse({ description: 'User does not have permission to view this project.' })
	@ApiNotFoundResponse({ description: 'The specified schema component was not found.' })
	findOne(
		@Param('projectId') projectId: string,
		@Param('name') name: string,
	): Promise<SchemaComponentDto> {
		return this.schemaComponentsService.findOneByName(projectId, name);
	}

	@Put(':name')
	@UseGuards(ProjectOwnerGuard)
	@ApiOkResponse({
		description: 'The schema component has been successfully updated.',
		type: SchemaComponentDto,
	})
	@ApiForbiddenResponse({ description: 'User does not have ownership of this project.' })
	@ApiNotFoundResponse({ description: 'The specified schema component was not found.' })
	@ApiConflictResponse({
		description: 'A schema component with the new name already exists.',
	})
	update(
		@Param('projectId') projectId: string,
		@Param('name') name: string,
		@Body() updateDto: UpdateSchemaComponentDto,
		@CurrentUser() user: UserDto,
	): Promise<SchemaComponentDto> {
		return this.schemaComponentsService.update(projectId, name, updateDto, user);
	}

	@Delete(':name')
	@UseGuards(ProjectOwnerGuard)
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiNoContentResponse({ description: 'The schema component has been successfully deleted.' })
	@ApiForbiddenResponse({ description: 'User does not have ownership of this project.' })
	@ApiNotFoundResponse({ description: 'The specified schema component was not found.' })
	async remove(
		@Param('projectId') projectId: string,
		@Param('name') name: string,
		@CurrentUser() user: UserDto,
	): Promise<void> {
		await this.schemaComponentsService.remove(projectId, name, user);
	}
}
