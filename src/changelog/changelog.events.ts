import { Endpoint } from '@prisma/client';
import { UserDto } from 'src/auth/dto/user.dto';

/**
 * A namespace for all endpoint-related changelog event names.
 */
export const EndpointEvent = {
	CREATED: 'endpoint.created',
	UPDATED: 'endpoint.updated',
	DELETED: 'endpoint.deleted',
};

/**
 * The payload structure for an endpoint change event.
 */
export interface EndpointChangeEvent {
	actor: UserDto;
	project: { id: string };
	endpoint: Pick<Endpoint, 'id' | 'method' | 'path'>;
}

export interface EndpointUpdateChangeEvent {
	actor: UserDto;
	project: { id: string };
	before: Endpoint;
	after: Endpoint;
}
