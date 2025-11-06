import { Endpoint, Note, Project } from '@prisma/client';
import { UserDto } from 'src/auth/dto/user.dto';

/**
 * A namespace for all note-related event names.
 */
export const NoteEvent = {
	CREATED: 'note.created',
	UPDATED: 'note.updated',
};

/**
 * A namespace for endpoint lifecycle events that trigger notifications.
 */
export const EndpointLifecycleEvent = {
	REVIEW_REQUESTED: 'endpoint.review_requested',
};

/**
 * The payload for note change events.
 */
export interface NoteChangeEvent {
	actor: UserDto;
	note: Note;
	project: { id: string };
	endpoint: { id: string };
}

/**
 * The payload for when an endpoint is submitted for review.
 */
export interface EndpointReviewRequestedEvent {
	actor: UserDto;
	project: Pick<Project, 'id' | 'name'>;
	endpoint: Pick<Endpoint, 'id' | 'method' | 'path'>;
}
