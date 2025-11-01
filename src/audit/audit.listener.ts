import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditEvent, type AuditLogEvent } from './audit.events';

@Injectable()
export class AuditListener {
	constructor(
		private readonly prisma: PrismaService,
		private readonly logger: PinoLogger,
	) {
		this.logger.setContext(AuditListener.name);
	}

	@OnEvent(AuditEvent, { async: true })
	async handleAuditLogEvent(payload: AuditLogEvent): Promise<void> {
		try {
			await this.prisma.auditLog.create({
				data: {
					actorId: payload.actor.id,
					actorUsername: payload.actor.username,
					action: payload.action,
					targetId: payload.targetId,
					details: payload.details ?? undefined,
				},
			});
		} catch (error: unknown) {
			this.logger.error({ error, payload }, 'Failed to write to audit log.');
		}
	}
}
