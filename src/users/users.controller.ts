import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UserDto } from 'src/auth/dto/user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Get()
	@ApiOkResponse({ description: 'A paginated list of sanitized users.' })
	findAllPaginated(@Query() paginationQuery: PaginationQueryDto) {
		return this.usersService.findAllPaginated(paginationQuery);
	}

	@Post('change-password')
	@ApiOkResponse({ description: 'Password changed successfully.' })
	async changePassword(
		@CurrentUser() user: UserDto,
		@Body() changePasswordDto: ChangePasswordDto,
	) {
		await this.usersService.updatePassword(user.id, changePasswordDto);
		return {
			message: 'Password updated successfully. Please log in again.',
		};
	}
}
