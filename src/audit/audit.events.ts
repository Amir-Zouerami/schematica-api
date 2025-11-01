import { Prisma } from '@prisma/client';
import { UserDto } from 'src/auth/dto/user.dto';

/**
 * The name of the event that is emitted for all audit log actions.
 * The AuditListener listens for this specific event.
 */
export const AuditEvent = 'audit.log';

/**
 * A type-safe enum of all possible actions that can be recorded
 * in the audit log.
 */
export enum AuditAction {
	// Project Actions
	PROJECT_CREATED = 'PROJECT_CREATED',
	PROJECT_UPDATED = 'PROJECT_UPDATED',
	PROJECT_DELETED = 'PROJECT_DELETED',
	PROJECT_ACCESS_UPDATED = 'PROJECT_ACCESS_UPDATED',
	PROJECT_SPEC_IMPORTED = 'PROJECT_SPEC_IMPORTED',

	// Team Actions
	TEAM_CREATED = 'TEAM_CREATED',
	TEAM_UPDATED = 'TEAM_UPDATED',
	TEAM_DELETED = 'TEAM_DELETED',

	// User Actions
	USER_CREATED = 'USER_CREATED',
	USER_UPDATED = 'USER_UPDATED',
	USER_DELETED = 'USER_DELETED',
	USER_PICTURE_UPDATED = 'USER_PICTURE_UPDATED',
}

/**
 * The standardized payload structure for any event that should be
 * recorded in the audit log.
 */
export interface AuditLogEvent {
	actor: UserDto;
	action: AuditAction;
	targetId: string;
	details?: Prisma.JsonValue;
}
