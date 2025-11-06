import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from 'src/prisma/prisma.service';
import {
	type EndpointChangeEvent,
	EndpointEvent,
	type EndpointStatusChangeEvent,
	type EndpointUpdateChangeEvent,
} from './changelog.events';

@Injectable()
export class ChangelogListener {
	constructor(
		private readonly prisma: PrismaService,
		private readonly logger: PinoLogger,
	) {
		this.logger.setContext(ChangelogListener.name);
	}

	@OnEvent(EndpointEvent.CREATED, { async: true })
	async handleEndpointCreated(payload: EndpointChangeEvent): Promise<void> {
		const { actor, project, endpoint } = payload;
		const message = `User '${actor.username}' added endpoint ${endpoint.method.toUpperCase()} ${
			endpoint.path
		}.`;

		await this.createChangelogEntry(project.id, endpoint.id, message, actor.id);
	}

	@OnEvent(EndpointEvent.UPDATED, { async: true })
	async handleEndpointUpdated(payload: EndpointUpdateChangeEvent): Promise<void> {
		const { actor, project, before, after } = payload;
		const messages: string[] = [];

		if (before.path !== after.path || before.method !== after.method) {
			messages.push(
				`User '${
					actor.username
				}' changed endpoint ${before.method.toUpperCase()} ${before.path} to ${after.method.toUpperCase()} ${
					after.path
				}.`,
			);
		}

		const beforeSummary = this.getOperationSummary(before.operation);
		const afterSummary = this.getOperationSummary(after.operation);

		if (beforeSummary !== afterSummary) {
			messages.push(
				`User '${
					actor.username
				}' updated the summary for endpoint ${after.method.toUpperCase()} ${after.path}.`,
			);
		}

		if (messages.length === 0) return;

		const promises = messages.map((message) =>
			this.createChangelogEntry(project.id, after.id, message, actor.id),
		);

		await Promise.all(promises);
	}

	@OnEvent(EndpointEvent.STATUS_UPDATED, { async: true })
	async handleEndpointStatusUpdated(payload: EndpointStatusChangeEvent): Promise<void> {
		const { actor, project, endpoint, fromStatus, toStatus } = payload;
		const message = `User '${
			actor.username
		}' changed status of endpoint ${endpoint.method.toUpperCase()} ${
			endpoint.path
		} from '${fromStatus}' to '${toStatus}'.`;

		await this.createChangelogEntry(project.id, endpoint.id, message, actor.id);
	}

	@OnEvent(EndpointEvent.DELETED, { async: true })
	async handleEndpointDeleted(payload: EndpointChangeEvent): Promise<void> {
		const { actor, project, endpoint } = payload;
		const message = `User '${actor.username}' deleted endpoint ${endpoint.method.toUpperCase()} ${
			endpoint.path
		}.`;

		await this.createChangelogEntry(project.id, endpoint.id, message, actor.id);
	}

	/**
	 * Attempts to create a changelog entry. Logs errors but does not throw.
	 * This is a fire-and-forget operation - failures will not propagate to callers.
	 */
	private createChangelogEntry(
		projectId: string,
		relatedId: string,
		message: string,
		actorId: string,
	): Promise<void> {
		return this.prisma.changelog
			.create({
				data: {
					projectId,
					relatedId,
					message,
					actorId,
				},
			})
			.then(() => undefined)
			.catch((error: unknown) => {
				this.logger.error(
					{ error, projectId, relatedId, actorId },
					'Failed to write to changelog.',
				);
			});
	}

	private getOperationSummary(operation: Prisma.JsonValue): string | undefined {
		if (
			typeof operation === 'object' &&
			operation !== null &&
			!Array.isArray(operation) &&
			'summary' in operation &&
			typeof operation.summary === 'string'
		) {
			return operation.summary;
		}
		return undefined;
	}
}
