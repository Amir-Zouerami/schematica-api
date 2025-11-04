import { Note } from '@prisma/client';
import { UserDto } from 'src/auth/dto/user.dto';

/**
 * A namespace for all note-related event names.
 */
export const NoteEvent = {
	CREATED: 'note.created',
	UPDATED: 'note.updated',
};

/**
 * The payload for note change events, containing all necessary context
 * for listeners like the Notification and Changelog systems.
 */
export interface NoteChangeEvent {
	actor: UserDto;
	note: Note;
	project: { id: string };
	endpoint: { id: string };
}
