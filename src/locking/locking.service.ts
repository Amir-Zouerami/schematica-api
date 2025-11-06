import { forwardRef, Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { UserDto } from 'src/auth/dto/user.dto';
import { ResourceLockedException } from 'src/common/exceptions/resource-locked.exception';
import { AllConfigTypes } from 'src/config/config.type';
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

	/**
	 * Attempts to acquire or refresh a lock on a resource for a specific user.
	 *
	 * @param resourceId The ID of the resource to lock (e.g., an endpointId).
	 * @param user The user attempting to acquire the lock.
	 * @returns The current lock information. If a new lock is acquired or an existing one
	 * is refreshed, the updated lock info is returned. If the resource is locked by another
	 * user, the existing lock info is returned.
	 */
	acquireLock(resourceId: string, user: UserDto): Lock {
		const existingLock = this.locks.get(resourceId);

		if (existingLock && existingLock.expiresAt > Date.now()) {
			// If the current user already holds the lock, refresh its expiration.
			if (existingLock.userId === user.id) {
				existingLock.expiresAt = Date.now() + this.lockDurationMs;
				this.logger.info(
					`Lock refreshed for resource ${resourceId} by user ${user.username}.`,
				);
				this.gateway.broadcastLockUpdate(resourceId, existingLock);
				return existingLock;
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

		return newLock;
	}

	/**
	 * Releases a lock on a resource, but only if the requesting user is the one
	 * who holds the lock.
	 *
	 * @param resourceId The ID of the resource to unlock.
	 * @param userId The ID of the user attempting to release the lock.
	 */
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

	/**
	 * Verifies if a resource is currently locked by a specific user.
	 *
	 * @param resourceId The ID of the resource to check.
	 * @param userId The ID of the user to check against the lock.
	 * @returns `true` if the user holds a valid lock, `false` otherwise.
	 */
	isLockedBy(resourceId: string, userId: string): boolean {
		const lock = this.locks.get(resourceId);
		return !!lock && lock.userId === userId && lock.expiresAt > Date.now();
	}

	/**
	 * Periodically iterates through the active locks and removes any that have expired.
	 * This is a failsafe to prevent resources from being permanently locked.
	 */
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
}
