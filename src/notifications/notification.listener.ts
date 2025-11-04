import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from './notification.service';
import { type NoteChangeEvent, NoteEvent } from './notifications.events';

@Injectable()
export class NotificationListener {
	constructor(private readonly notificationService: NotificationService) {}

	@OnEvent(NoteEvent.CREATED, { async: true })
	async handleNoteCreated(payload: NoteChangeEvent): Promise<void> {
		await this.notificationService.createNotificationsForMentions(payload);
	}

	@OnEvent(NoteEvent.UPDATED, { async: true })
	async handleNoteUpdated(payload: NoteChangeEvent): Promise<void> {
		await this.notificationService.createNotificationsForMentions(payload);
	}
}
