import { HttpStatus } from '@nestjs/common';
import { Lock } from 'src/locking/locking.service';
import { BaseAppException } from './base-app.exception';

export class ResourceLockedException extends BaseAppException {
	constructor(lock: Lock) {
		const responsePayload = {
			message: 'This resource is currently locked by another user.',
			lock: {
				username: lock.username,
				expiresAt: new Date(lock.expiresAt).toISOString(),
			},
		};

		super(responsePayload, HttpStatus.CONFLICT, 'RESOURCE_LOCKED');
	}
}
