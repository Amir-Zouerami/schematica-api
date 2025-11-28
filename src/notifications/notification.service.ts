import {
	forwardRef,
	Inject,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { USERNAME_PATTERN } from 'src/common/constants/validation.constants';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PaginatedServiceResponse } from 'src/common/interfaces/api-response.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationDto, UserNotificationWithDetails } from './dto/notification.dto';
import { EndpointReviewRequestedEvent, NoteChangeEvent } from './notifications.events';
import { NotificationsGateway } from './notifications.gateway';

const MENTION_REGEX = new RegExp(`@(${USERNAME_PATTERN})`, 'g');

@Injectable()
export class NotificationService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly logger: PinoLogger,
		@Inject(forwardRef(() => NotificationsGateway))
		private readonly gateway: NotificationsGateway,
	) {
		this.logger.setContext(NotificationService.name);
	}

	async createNotificationsForMentions(event: NoteChangeEvent): Promise<void> {
		const { actor, note, project, endpoint } = event;

		const mentions = this.parseMentions(note.content);
		if (mentions.size === 0) return;

		try {
			const mentionedUsers = await this.prisma.user.findMany({
				where: {
					username: { in: Array.from(mentions) },
				},
				select: { id: true },
			});

			if (mentionedUsers.length === 0) return;

			const recipientIds = mentionedUsers.map((u) => u.id);
			const message = `User '${actor.username}' mentioned you in a note on an endpoint.`;
			const link = `/projects/${project.id}/endpoints/${endpoint.id}`;

			await this.createAndBroadcastNotifications(message, link, actor.id, recipientIds);
		} catch (error: unknown) {
			this.logger.error({ error, event }, 'Failed to create notifications for mentions.');
		}
	}

	async createNotificationForEndpointReview(event: EndpointReviewRequestedEvent): Promise<void> {
		const { actor, project, endpoint } = event;

		try {
			const projectOwners = await this.prisma.user.findMany({
				where: {
					OR: [
						{ projectAccesses: { some: { projectId: project.id, type: 'OWNER' } } },
						{
							teamMemberships: {
								some: {
									team: {
										projectAccesses: {
											some: { projectId: project.id, type: 'OWNER' },
										},
									},
								},
							},
						},
					],
					NOT: { id: actor.id },
				},
				select: { id: true },
			});

			if (projectOwners.length === 0) return;

			const recipientIds = projectOwners.map((u) => u.id);
			const message = `User '${actor.username}' requested a review for an endpoint in project '${project.name}'.`;
			const link = `/projects/${project.id}/endpoints/${endpoint.id}`;

			await this.createAndBroadcastNotifications(message, link, actor.id, recipientIds);
		} catch (error: unknown) {
			this.logger.error(
				{ error, event },
				'Failed to create notifications for endpoint review request.',
			);
		}
	}

	async findAllForUser(
		userId: string,
		paginationQuery: PaginationQueryDto,
	): Promise<PaginatedServiceResponse<NotificationDto>> {
		const { limit, skip, page } = paginationQuery;
		const where = { userId };

		const [statuses, total] = await this.prisma.$transaction([
			this.prisma.userNotificationStatus.findMany({
				where,
				include: {
					notification: {
						include: { actor: true },
					},
				},
				skip,
				take: limit,
				orderBy: { notification: { createdAt: 'desc' } },
			}),
			this.prisma.userNotificationStatus.count({ where }),
		]);

		return {
			data: statuses.map((status) => new NotificationDto(status)),
			meta: {
				total,
				page,
				limit,
				lastPage: Math.ceil(total / limit) || 1,
			},
		};
	}

	async markAsRead(notificationId: number, userId: string): Promise<NotificationDto> {
		try {
			const status = await this.prisma.userNotificationStatus.findUnique({
				where: { notificationId_userId: { notificationId, userId } },
			});

			if (!status || status.isRead) {
				throw new NotFoundException('Notification not found or already marked as read.');
			}

			const updatedStatus = await this.prisma.userNotificationStatus.update({
				where: {
					notificationId_userId: { notificationId, userId },
				},
				data: {
					isRead: true,
					readAt: new Date(),
				},
				include: {
					notification: {
						include: { actor: true },
					},
				},
			});

			return new NotificationDto(updatedStatus);
		} catch (error: unknown) {
			if (error instanceof NotFoundException) {
				throw error;
			}

			this.logger.error({ error }, 'Failed to mark notification as read.');
			throw new NotFoundException('Could not update notification.');
		}
	}

	/**
	 * Marks all unread notifications for a specific user as read.
	 * Returns the count of updated records.
	 */
	async markAllAsRead(userId: string): Promise<{ count: number }> {
		try {
			const result = await this.prisma.userNotificationStatus.updateMany({
				where: {
					userId: userId,
					isRead: false,
				},
				data: {
					isRead: true,
					readAt: new Date(),
				},
			});

			return { count: result.count };
		} catch (error: unknown) {
			this.logger.error({ error, userId }, 'Failed to mark all notifications as read.');
			throw new InternalServerErrorException('Could not update notifications.');
		}
	}

	/**
	 * A reusable helper to create a notification, link it to multiple users,
	 * and broadcast it via WebSockets.
	 */
	private async createAndBroadcastNotifications(
		message: string,
		link: string,
		actorId: string,
		recipientIds: string[],
	) {
		await this.prisma.$transaction(async (tx) => {
			const notification = await tx.notification.create({
				data: { message, link, actorId },
				include: { actor: true },
			});

			const existingStatuses = await tx.userNotificationStatus.findMany({
				where: {
					notificationId: notification.id,
					userId: { in: recipientIds },
				},
				select: { userId: true },
			});

			const existingUserIds = new Set(existingStatuses.map((s) => s.userId));
			const newUserIdsToNotify = recipientIds.filter(
				(userId) => !existingUserIds.has(userId),
			);

			if (newUserIdsToNotify.length > 0) {
				const statusesToCreate = newUserIdsToNotify.map((userId) => ({
					notificationId: notification.id,
					userId,
				}));

				await tx.userNotificationStatus.createMany({
					data: statusesToCreate,
				});

				for (const userId of newUserIdsToNotify) {
					const statusForPush: UserNotificationWithDetails = {
						notificationId: notification.id,
						userId: userId,
						isRead: false,
						readAt: null,
						notification: notification,
					};
					this.gateway.sendNotificationToUser(userId, new NotificationDto(statusForPush));
				}
			}
		});
	}

	private parseMentions(content: string): Set<string> {
		const matches = content.matchAll(MENTION_REGEX);
		const mentions = new Set<string>();
		for (const match of matches) {
			mentions.add(match[1]);
		}
		return mentions;
	}
}
