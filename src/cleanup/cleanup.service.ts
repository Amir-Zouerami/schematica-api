import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PinoLogger } from 'nestjs-pino';
import { AllConfigTypes } from 'src/config/config.type';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CleanupService {
	private readonly logRetentionDays: number;

	constructor(
		private readonly prisma: PrismaService,
		private readonly logger: PinoLogger,
		private readonly configService: ConfigService<AllConfigTypes, true>,
	) {
		this.logger.setContext(CleanupService.name);
		this.logRetentionDays = this.configService.get('app.logRetentionDays', { infer: true });
	}

	@Cron(CronExpression.EVERY_DAY_AT_3AM)
	async handleLogCleanup() {
		this.logger.info(
			`Starting scheduled cleanup job. Deleting logs older than ${this.logRetentionDays} days.`,
		);

		if (this.logRetentionDays <= 0) {
			this.logger.warn('Log retention is disabled. Skipping cleanup job.');
			return;
		}

		try {
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - this.logRetentionDays);

			const [auditLogs, changelogs] = await this.prisma.$transaction([
				this.prisma.auditLog.deleteMany({
					where: { createdAt: { lt: cutoffDate } },
				}),
				this.prisma.changelog.deleteMany({
					where: { createdAt: { lt: cutoffDate } },
				}),
			]);

			this.logger.info(
				{ deletedCounts: { auditLogs: auditLogs.count, changelogs: changelogs.count } },
				'Log cleanup job completed successfully.',
			);
		} catch (error: unknown) {
			this.logger.error({ error }, 'Log cleanup job failed.');
		}
	}
}
