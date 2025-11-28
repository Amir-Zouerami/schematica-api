import {
	BadRequestException,
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
	UseInterceptors,
} from '@nestjs/common';
import {
	ApiBearerAuth,
	ApiBody,
	ApiConflictResponse,
	ApiConsumes,
	ApiCreatedResponse,
	ApiForbiddenResponse,
	ApiNoContentResponse,
	ApiNotFoundResponse,
	ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserDto } from 'src/auth/dto/user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiPaginatedResponse } from 'src/common/decorators/api-paginated-response.decorator';
import { ErrorResponseDto } from 'src/common/dto/error-response.dto';
import { PaginationSearchQueryDto } from 'src/common/dto/pagination-search-query.dto';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { FileInterceptor, UploadedFile } from 'src/common/interceptors/file.interceptor';
import { PaginatedServiceResponse } from 'src/common/interfaces/api-response.interface';
import { ImageFilePipe } from 'src/common/pipes/image-file.pipe';
import type { UploadedFile as UploadedFileType } from 'src/types/fastify';
import { AdminUsersService } from './admin-users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Admin - Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin)
@Controller('admin/users')
export class AdminUsersController {
	constructor(private readonly adminUsersService: AdminUsersService) {}

	@Post()
	@UseInterceptors(FileInterceptor)
	@UseInterceptors(FileInterceptor)
	@ApiConsumes('multipart/form-data')
	@ApiCreatedResponse({ description: 'The user has been successfully created.', type: UserDto })
	@ApiForbiddenResponse({
		description: 'User does not have admin privileges.',
		type: ErrorResponseDto,
	})
	@ApiConflictResponse({
		description: 'A user with this username already exists.',
		type: ErrorResponseDto,
	})
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				username: { type: 'string' },
				password: { type: 'string' },
				role: { type: 'string', enum: Object.values(Role) },
				teams: { type: 'array', items: { type: 'string' } },
				file: { type: 'string', format: 'binary' },
			},
		},
	})
	create(
		@Body() createUserDto: CreateUserDto,
		@CurrentUser() user: UserDto,
		@UploadedFile(new ImageFilePipe()) file?: UploadedFileType,
	): Promise<UserDto> {
		return this.adminUsersService.create(createUserDto, user, file);
	}

	@Get()
	@ApiPaginatedResponse(UserDto)
	@ApiForbiddenResponse({
		description: 'User does not have admin privileges.',
		type: ErrorResponseDto,
	})
	findAll(
		@Query() paginationQuery: PaginationSearchQueryDto,
	): Promise<PaginatedServiceResponse<UserDto>> {
		return this.adminUsersService.findAll(paginationQuery);
	}

	@Put(':userId')
	@ApiForbiddenResponse({
		description: 'User does not have admin privileges.',
		type: ErrorResponseDto,
	})
	@ApiNotFoundResponse({
		description: 'The specified user was not found.',
		type: ErrorResponseDto,
	})
	update(
		@Param('userId') userId: string,
		@Body() updateUserDto: UpdateUserDto,
		@CurrentUser() user: UserDto,
	): Promise<UserDto> {
		return this.adminUsersService.update(userId, updateUserDto, user);
	}

	@Delete(':userId')
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiNoContentResponse({ description: 'The user has been successfully deleted.' })
	@ApiForbiddenResponse({
		description: 'User does not have admin privileges.',
		type: ErrorResponseDto,
	})
	@ApiNotFoundResponse({
		description: 'The specified user was not found.',
		type: ErrorResponseDto,
	})
	async remove(@Param('userId') userId: string, @CurrentUser() user: UserDto): Promise<void> {
		await this.adminUsersService.remove(userId, user);
	}

	@Put(':userId/picture')
	@UseInterceptors(FileInterceptor)
	@ApiConsumes('multipart/form-data')
	@ApiForbiddenResponse({
		description: 'User does not have admin privileges.',
		type: ErrorResponseDto,
	})
	@ApiNotFoundResponse({
		description: 'The specified user was not found.',
		type: ErrorResponseDto,
	})
	@ApiBody({
		schema: {
			type: 'object',
			required: ['file'],
			properties: { file: { type: 'string', format: 'binary' } },
		},
	})
	updateProfilePicture(
		@Param('userId') userId: string,
		@CurrentUser() user: UserDto,
		@UploadedFile(new ImageFilePipe()) file?: UploadedFileType,
	): Promise<UserDto> {
		if (!file) {
			throw new BadRequestException('Profile picture file is required.');
		}

		return this.adminUsersService.updateProfilePicture(userId, file, user);
	}
}
