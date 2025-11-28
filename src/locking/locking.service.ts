import { forwardRef, Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { UserDto } from 'src/auth/dto/user.dto';
import { ResourceLockedException } from 'src/common/exceptions/resource-locked.exception';
import { AllConfigTypes } from 'src/config/config.type';
import { LockDto } from './dto/lock.dto';
import { LockingGateway } from './locking.gateway';

export interface Lock {
	userId: string;
	username: string;
	expiresAt: number;
}

@Injectable()
export class LockingService implements OnModuleInit, OnModuleDestroy {
	private readonly locks = new Map<string, Lock>();
	private cleanupInterval: NodeJS.Timeout;

	private readonly lockDurationMs: number;
	private readonly cleanupIntervalMs: number;

	constructor(
		private readonly logger: PinoLogger,
		private readonly configService: ConfigService<AllConfigTypes, true>,
		@Inject(forwardRef(() => LockingGateway))
		private readonly gateway: LockingGateway,
	) {
		this.logger.setContext(LockingService.name);
		this.lockDurationMs = this.configService.get('app.lockDurationMs', { infer: true });
		this.cleanupIntervalMs = this.configService.get('app.lockCleanupIntervalMs', {
			infer: true,
		});
	}

	onModuleInit() {
		this.cleanupInterval = setInterval(
			() => this.cleanupExpiredLocks(),
			this.cleanupIntervalMs,
		);

		this.logger.info('Lock cleanup job started.');
	}

	onModuleDestroy() {
		clearInterval(this.cleanupInterval);
		this.logger.info('Lock cleanup job stopped.');
	}

	acquireLock(resourceId: string, user: UserDto): LockDto {
		const existingLock = this.locks.get(resourceId);

		if (existingLock && existingLock.expiresAt > Date.now()) {
			if (existingLock.userId === user.id) {
				existingLock.expiresAt = Date.now() + this.lockDurationMs;
				this.logger.info(
					`Lock refreshed for resource ${resourceId} by user ${user.username}.`,
				);

				this.gateway.broadcastLockUpdate(resourceId, existingLock);
				return {
					...existingLock,
					expiresAt: new Date(existingLock.expiresAt).toISOString(),
				};
			}

			throw new ResourceLockedException(existingLock);
		}

		const newLock: Lock = {
			userId: user.id,
			username: user.username,
			expiresAt: Date.now() + this.lockDurationMs,
		};

		this.locks.set(resourceId, newLock);
		this.logger.info(`Lock acquired for resource ${resourceId} by user ${user.username}.`);
		this.gateway.broadcastLockUpdate(resourceId, newLock);

		return {
			...newLock,
			expiresAt: new Date(newLock.expiresAt).toISOString(),
		};
	}

	releaseLock(resourceId: string, userId: string): void {
		const existingLock = this.locks.get(resourceId);

		if (existingLock && existingLock.userId === userId) {
			this.locks.delete(resourceId);
			this.logger.info(`Lock released for resource ${resourceId} by user ${userId}.`);
			this.gateway.broadcastLockUpdate(resourceId, null);
		} else {
			this.logger.warn(
				`User ${userId} attempted to release a lock on ${resourceId} that they do not own.`,
			);
		}
	}

	isLockedBy(resourceId: string, userId: string): boolean {
		const lock = this.locks.get(resourceId);
		return !!lock && lock.userId === userId && lock.expiresAt > Date.now();
	}

	private cleanupExpiredLocks(): void {
		const now = Date.now();
		let expiredCount = 0;

		for (const [resourceId, lock] of this.locks.entries()) {
			if (lock.expiresAt <= now) {
				this.locks.delete(resourceId);
				this.gateway.broadcastLockUpdate(resourceId, null);
				expiredCount++;
			}
		}

		if (expiredCount > 0) {
			this.logger.info(`Cleaned up ${expiredCount} expired lock(s).`);
		}
	}

	/**
	 * Retrieves the current lock status for a resource if it exists and is not expired.
	 *
	 * @param resourceId The ID of the resource to check.
	 * @returns The current lock information, or null if there is no active lock.
	 */
	getLockStatus(resourceId: string): Lock | null {
		const lock = this.locks.get(resourceId);
		if (lock && lock.expiresAt > Date.now()) {
			return lock;
		}
		return null;
	}
}
