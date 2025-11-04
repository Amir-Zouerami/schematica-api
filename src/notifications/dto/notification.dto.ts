import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { SanitizedUserDto } from 'src/users/dto/sanitized-user.dto';

const _userNotificationWithDetails = Prisma.validator<Prisma.UserNotificationStatusDefaultArgs>()({
	include: {
		notification: {
			include: {
				actor: true,
			},
		},
	},
});

export type UserNotificationWithDetails = Prisma.UserNotificationStatusGetPayload<
	typeof _userNotificationWithDetails
>;

export class NotificationDto {
	@ApiProperty()
	notificationId: number;

	@ApiProperty()
	message: string;

	@ApiProperty()
	link: string;

	@ApiProperty()
	createdAt: Date;

	@ApiProperty()
	isRead: boolean;

	@ApiProperty({ nullable: true })
	readAt: Date | null;

	@ApiProperty({ type: () => SanitizedUserDto, nullable: true })
	actor: SanitizedUserDto | null;

	constructor(status: UserNotificationWithDetails) {
		this.notificationId = status.notificationId;
		this.message = status.notification.message;
		this.link = status.notification.link;
		this.createdAt = status.notification.createdAt;
		this.isRead = status.isRead;
		this.readAt = status.readAt;
		this.actor = status.notification.actor
			? new SanitizedUserDto(status.notification.actor)
			: null;
	}
}
