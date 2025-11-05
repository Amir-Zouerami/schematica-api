/**
 * The core pattern for a valid username, without anchors.
 * Allowed characters are: letters (a-z, A-Z), numbers (0-9), dot (.), and underscore (_).
 * The hyphen (-) must be at the end to be treated as a literal character.
 */
export const USERNAME_PATTERN = '[a-zA-Z0-9._-]+';

/**
 * The full regex used for validating a username string from start to end.
 */
export const USERNAME_REGEX = new RegExp(`^${USERNAME_PATTERN}$`);

export const USERNAME_VALIDATION_MESSAGE =
	'Username can only contain letters, numbers, dots, hyphens, and underscores.';
