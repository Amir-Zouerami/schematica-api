import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	ParseIntPipe,
	Patch,
	Post,
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
import { CreateSecretDto } from './dto/create-secret.dto';
import { SecretDto } from './dto/secret.dto';
import { UpdateSecretDto } from './dto/update-secret.dto';
import { SecretsService } from './secrets.service';

@ApiTags('Projects - Secrets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/environments/:environmentId/secrets')
export class SecretsController {
	constructor(private readonly secretsService: SecretsService) {}

	@Post()
	@CheckResourceRelations({
		parentModel: 'Project',
		parentParam: 'projectId',
		relationName: 'environments',
		childParam: 'environmentId',
		childModelName: 'Environment',
	})
	@UseGuards(ProjectOwnerGuard, ResourceRelationsGuard)
	@ApiCreatedResponse({
		description: 'The secret has been successfully created.',
		type: SecretDto,
	})
	@ApiForbiddenResponse({
		description: 'User does not have ownership of this project.',
		type: ErrorResponseDto,
	})
	@ApiConflictResponse({
		description: 'A secret with this key already exists.',
		type: ErrorResponseDto,
	})
	create(
		@Param('environmentId') environmentId: string,
		@Body() createSecretDto: CreateSecretDto,
		@CurrentUser() user: UserDto,
	): Promise<SecretDto> {
		return this.secretsService.create(environmentId, createSecretDto, user);
	}

	@Get()
	@CheckResourceRelations({
		parentModel: 'Project',
		parentParam: 'projectId',
		relationName: 'environments',
		childParam: 'environmentId',
		childModelName: 'Environment',
	})
	@UseGuards(ProjectOwnerGuard, ResourceRelationsGuard)
	@ApiOkResponse({
		description: 'A list of all decrypted secrets for the environment.',
		type: [SecretDto],
	})
	@ApiForbiddenResponse({
		description: 'User does not have permission to view this project.',
		type: ErrorResponseDto,
	})
	findAll(@Param('environmentId') environmentId: string): Promise<SecretDto[]> {
		return this.secretsService.findAllForEnvironment(environmentId);
	}

	@Patch(':secretId')
	@CheckResourceRelations({
		parentModel: 'Environment',
		parentParam: 'environmentId',
		relationName: 'secrets',
		childParam: 'secretId',
		childModelName: 'Secret',
		childParamIsInt: true,
	})
	@UseGuards(ProjectOwnerGuard, ResourceRelationsGuard)
	@ApiOkResponse({ description: 'The secret has been successfully updated.', type: SecretDto })
	@ApiForbiddenResponse({
		description: 'User does not have ownership of this project.',
		type: ErrorResponseDto,
	})
	@ApiNotFoundResponse({
		description: 'The specified secret was not found.',
		type: ErrorResponseDto,
	})
	update(
		@Param('environmentId') environmentId: string,
		@Param('secretId', ParseIntPipe) secretId: number,
		@Body() updateSecretDto: UpdateSecretDto,
		@CurrentUser() user: UserDto,
	): Promise<SecretDto> {
		return this.secretsService.update(environmentId, secretId, updateSecretDto, user);
	}

	@Delete(':secretId')
	@CheckResourceRelations({
		parentModel: 'Environment',
		parentParam: 'environmentId',
		relationName: 'secrets',
		childParam: 'secretId',
		childModelName: 'Secret',
		childParamIsInt: true,
	})
	@UseGuards(ProjectOwnerGuard, ResourceRelationsGuard)
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiNoContentResponse({ description: 'The secret has been successfully deleted.' })
	@ApiForbiddenResponse({
		description: 'User does not have ownership of this project.',
		type: ErrorResponseDto,
	})
	@ApiNotFoundResponse({
		description: 'The specified secret was not found.',
		type: ErrorResponseDto,
	})
	async remove(
		@Param('environmentId') environmentId: string,
		@Param('secretId', ParseIntPipe) secretId: number,
		@CurrentUser() user: UserDto,
	): Promise<void> {
		await this.secretsService.remove(environmentId, secretId, user);
	}
}
