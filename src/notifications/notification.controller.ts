import {
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	ParseIntPipe,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UserDto } from 'src/auth/dto/user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PaginatedServiceResponse } from 'src/common/interfaces/api-response.interface';
import { NotificationDto } from './dto/notification.dto';
import { NotificationService } from './notification.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
	constructor(private readonly notificationService: NotificationService) {}

	@Get()
	@ApiOkResponse({
		description: "A paginated list of the current user's notifications.",
		type: [NotificationDto],
	})
	findAll(
		@CurrentUser() user: UserDto,
		@Query() paginationQuery: PaginationQueryDto,
	): Promise<PaginatedServiceResponse<NotificationDto>> {
		return this.notificationService.findAllForUser(user.id, paginationQuery);
	}

	@Post(':notificationId/read')
	@HttpCode(HttpStatus.OK)
	@ApiOkResponse({
		description: 'The notification has been successfully marked as read.',
		type: NotificationDto,
	})
	@ApiNotFoundResponse({ description: 'Notification not found or already marked as read.' })
	markAsRead(
		@CurrentUser() user: UserDto,
		@Param('notificationId', ParseIntPipe) notificationId: number,
	): Promise<NotificationDto> {
		return this.notificationService.markAsRead(notificationId, user.id);
	}
}
