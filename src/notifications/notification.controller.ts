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
import {
	ApiBearerAuth,
	ApiNotFoundResponse,
	ApiOkResponse,
	ApiOperation,
	ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UserDto } from 'src/auth/dto/user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiPaginatedResponse } from 'src/common/decorators/api-paginated-response.decorator';
import { ErrorResponseDto } from 'src/common/dto/error-response.dto';
import { MessageResponseDto } from 'src/common/dto/message-response.dto';
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

	@Post('read-all')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Mark all notifications as read',
		description: 'Bulk updates all unread notifications for the current user.',
	})
	@ApiOkResponse({
		description: 'All unread notifications have been marked as read.',
		type: MessageResponseDto,
	})
	async markAllAsRead(@CurrentUser() user: UserDto): Promise<MessageResponseDto> {
		const { count } = await this.notificationService.markAllAsRead(user.id);
		return {
			message: `Successfully marked ${count} notification(s) as read.`,
		};
	}

	@Get()
	@ApiPaginatedResponse(NotificationDto)
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
	@ApiNotFoundResponse({
		description: 'Notification not found or already marked as read.',
		type: ErrorResponseDto,
	})
	markAsRead(
		@CurrentUser() user: UserDto,
		@Param('notificationId', ParseIntPipe) notificationId: number,
	): Promise<NotificationDto> {
		return this.notificationService.markAsRead(notificationId, user.id);
	}
}
