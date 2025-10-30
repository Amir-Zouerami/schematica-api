import {
	Body,
	Controller,
	Delete,
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
import { CreateEndpointDto } from './dto/create-endpoint.dto';
import { EndpointDto } from './dto/endpoint.dto';
import { UpdateEndpointDto } from './dto/update-endpoint.dto';
import { EndpointsService } from './endpoints.service';
import { ProjectOwnerGuard } from './guards/project-owner.guard';

@ApiTags('Projects - Endpoints')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectOwnerGuard)
@Controller('projects/:projectId/endpoints')
export class EndpointsController {
	constructor(private readonly endpointsService: EndpointsService) {}

	@Post()
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
		@Param('endpointId') endpointId: string, // projectId is still available from the controller's path
		@Body() updateEndpointDto: UpdateEndpointDto,
		@CurrentUser() user: UserDto,
	): Promise<EndpointDto> {
		return this.endpointsService.update(endpointId, updateEndpointDto, user);
	}

	@Delete(':endpointId')
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiNoContentResponse({ description: 'The endpoint has been successfully deleted.' })
	@ApiForbiddenResponse({ description: 'User does not have ownership of this project.' })
	@ApiNotFoundResponse({ description: 'The specified endpoint was not found.' })
	async remove(@Param('endpointId') endpointId: string): Promise<void> {
		await this.endpointsService.remove(endpointId);
	}
}
