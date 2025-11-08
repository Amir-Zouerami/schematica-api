import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UserDto } from 'src/auth/dto/user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PaginationSearchQueryDto } from 'src/common/dto/pagination-search-query.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SanitizedUserDto } from './dto/sanitized-user.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Get()
	@ApiOkResponse({
		description: 'A paginated list of sanitized users.',
		type: [SanitizedUserDto],
	})
	findAllPaginated(@Query() paginationQuery: PaginationSearchQueryDto) {
		return this.usersService.findAllPaginated(paginationQuery);
	}

	@Post('change-password')
	@HttpCode(HttpStatus.OK)
	@ApiOkResponse({ description: 'Password changed successfully.' })
	async changePassword(
		@CurrentUser() user: UserDto,
		@Body() changePasswordDto: ChangePasswordDto,
	) {
		await this.usersService.updatePassword(user.id, changePasswordDto);
		return {
			message: 'Password updated successfully.',
		};
	}

	@Post('set-password')
	@HttpCode(HttpStatus.OK)
	@ApiOkResponse({ description: 'Password set successfully.' })
	async setPassword(@CurrentUser() user: UserDto, @Body() setPasswordDto: SetPasswordDto) {
		await this.usersService.setPassword(user.id, setPasswordDto);
		return {
			message:
				'Password set successfully. You can now log in using your username and password.',
		};
	}
}
