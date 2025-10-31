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
import { Role } from '@prisma/client';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserDto } from 'src/auth/dto/user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { PaginatedServiceResponse } from 'src/common/interfaces/api-response.interface';
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
	@ApiCreatedResponse({ description: 'The user has been successfully created.', type: UserDto })
	@ApiForbiddenResponse({ description: 'User does not have admin privileges.' })
	@ApiConflictResponse({ description: 'A user with this username already exists.' })
	create(@Body() createUserDto: CreateUserDto): Promise<UserDto> {
		return this.adminUsersService.create(createUserDto);
	}

	@Get()
	@ApiOkResponse({
		description: 'A paginated list of all users in the system.',
		type: [UserDto],
	})
	@ApiForbiddenResponse({ description: 'User does not have admin privileges.' })
	findAll(
		@Query() paginationQuery: PaginationQueryDto,
	): Promise<PaginatedServiceResponse<UserDto>> {
		return this.adminUsersService.findAll(paginationQuery);
	}

	@Put(':userId')
	@ApiOkResponse({ description: 'The user has been successfully updated.', type: UserDto })
	@ApiForbiddenResponse({ description: 'User does not have admin privileges.' })
	@ApiNotFoundResponse({ description: 'The specified user was not found.' })
	update(
		@Param('userId') userId: string,
		@Body() updateUserDto: UpdateUserDto,
	): Promise<UserDto> {
		return this.adminUsersService.update(userId, updateUserDto);
	}

	@Delete(':userId')
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiNoContentResponse({ description: 'The user has been successfully deleted.' })
	@ApiForbiddenResponse({ description: 'User does not have admin privileges.' })
	@ApiNotFoundResponse({ description: 'The specified user was not found.' })
	async remove(@Param('userId') userId: string): Promise<void> {
		await this.adminUsersService.remove(userId);
	}
}
