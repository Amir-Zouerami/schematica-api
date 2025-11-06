import { Endpoint, EndpointStatus } from '@prisma/client';
import { UserDto } from 'src/auth/dto/user.dto';

/**
 * A namespace for all endpoint-related changelog event names.
 */
export const EndpointEvent = {
	CREATED: 'endpoint.created',
	UPDATED: 'endpoint.updated',
	DELETED: 'endpoint.deleted',
	STATUS_UPDATED: 'endpoint.status.updated',
};

/**
 * The payload structure for an endpoint creation or deletion event.
 */
export interface EndpointChangeEvent {
	actor: UserDto;
	project: { id: string };
	endpoint: Pick<Endpoint, 'id' | 'method' | 'path'>;
}

/**
 * The payload structure for an endpoint content update event.
 */
export interface EndpointUpdateChangeEvent {
	actor: UserDto;
	project: { id: string };
	before: Endpoint;
	after: Endpoint;
}

/**
 * The payload structure for an endpoint status change event.
 */
export interface EndpointStatusChangeEvent {
	actor: UserDto;
	project: { id: string };
	endpoint: Pick<Endpoint, 'id' | 'method' | 'path'>;
	fromStatus: EndpointStatus;
	toStatus: EndpointStatus;
}
