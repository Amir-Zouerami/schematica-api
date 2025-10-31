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
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PaginatedServiceResponse } from 'src/common/interfaces/api-response.interface';
import { ProjectOwnerGuard } from '../../common/guards/project-owner.guard';
import { ProjectViewerGuard } from '../../common/guards/project-viewer.guard';
import { CreateEndpointDto } from './dto/create-endpoint.dto';
import { EndpointSummaryDto } from './dto/endpoint-summary.dto';
import { EndpointDto } from './dto/endpoint.dto';
import { UpdateEndpointDto } from './dto/update-endpoint.dto';
import { EndpointsService } from './endpoints.service';

@ApiTags('Projects - Endpoints')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/endpoints')
export class EndpointsController {
	constructor(private readonly endpointsService: EndpointsService) {}

	@Get()
	@UseGuards(ProjectViewerGuard)
	@ApiOkResponse({
		description: 'A paginated list of endpoints for the project.',
		type: [EndpointSummaryDto],
	})
	@ApiForbiddenResponse({ description: 'User does not have permission to view this project.' })
	@ApiNotFoundResponse({ description: 'Project not found or user lacks access.' })
	findAll(
		@Param('projectId') projectId: string,
		@Query() paginationQuery: PaginationQueryDto,
	): Promise<PaginatedServiceResponse<EndpointSummaryDto>> {
		return this.endpointsService.findAllForProject(projectId, paginationQuery);
	}

	@Get(':endpointId')
	@UseGuards(ProjectViewerGuard)
	@ApiOkResponse({
		description: 'The detailed information for a single endpoint.',
		type: EndpointDto,
	})
	@ApiForbiddenResponse({ description: 'User does not have permission to view this project.' })
	@ApiNotFoundResponse({ description: 'Project or endpoint not found.' })
	findOne(
		@Param('projectId') projectId: string,
		@Param('endpointId') endpointId: string,
	): Promise<EndpointDto> {
		return this.endpointsService.findOneById(projectId, endpointId);
	}

	@Post()
	@UseGuards(ProjectOwnerGuard)
	@ApiCreatedResponse({
		description: 'The endpoint has been successfully added.',
		type: EndpointDto,
	})
	@ApiForbiddenResponse({ description: 'User does not have ownership of this project.' })
	@ApiConflictResponse({
		description: 'An endpoint with the same path and method already exists in this project.',
	})
	create(
		@Param('projectId') projectId: string,
		@Body() createEndpointDto: CreateEndpointDto,
		@CurrentUser() user: UserDto,
	): Promise<EndpointDto> {
		return this.endpointsService.create(projectId, createEndpointDto, user);
	}

	@Put(':endpointId')
	@UseGuards(ProjectOwnerGuard)
	@ApiOkResponse({
		description: 'The endpoint has been successfully updated.',
		type: EndpointDto,
	})
	@ApiForbiddenResponse({ description: 'User does not have ownership of this project.' })
	@ApiNotFoundResponse({ description: 'The specified endpoint was not found.' })
	@ApiConflictResponse({
		description:
			'A concurrency conflict occurred, or the new path/method conflicts with an existing endpoint.',
	})
	update(
		@Param('projectId') projectId: string,
		@Param('endpointId') endpointId: string,
		@Body() updateEndpointDto: UpdateEndpointDto,
		@CurrentUser() user: UserDto,
	): Promise<EndpointDto> {
		return this.endpointsService.update(projectId, endpointId, updateEndpointDto, user);
	}

	@Delete(':endpointId')
	@UseGuards(ProjectOwnerGuard)
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiNoContentResponse({ description: 'The endpoint has been successfully deleted.' })
	@ApiForbiddenResponse({ description: 'User does not have ownership of this project.' })
	@ApiNotFoundResponse({ description: 'The specified endpoint was not found.' })
	async remove(
		@Param('projectId') projectId: string,
		@Param('endpointId') endpointId: string,
	): Promise<void> {
		await this.endpointsService.remove(projectId, endpointId);
	}
}
