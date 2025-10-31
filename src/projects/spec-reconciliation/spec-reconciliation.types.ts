import { Prisma } from '@prisma/client';

export interface EndpointAppMetadata {
	createdBy: string;
	createdAt: string;
	lastEditedBy: string;
	lastEditedAt: string;
	[key: string]: Prisma.JsonValue | undefined;
}

/**
 * A strict type guard to check if a generic JsonValue from Prisma conforms
 * to our required EndpointAppMetadata structure.
 *
 * @param obj The JsonValue to check.
 * @returns `true` if the object is valid EndpointAppMetadata.
 */
export function isEndpointAppMetadata(obj: Prisma.JsonValue): obj is EndpointAppMetadata {
	if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
		return false;
	}

	return (
		'createdBy' in obj &&
		typeof obj.createdBy === 'string' &&
		'createdAt' in obj &&
		typeof obj.createdAt === 'string' &&
		'lastEditedBy' in obj &&
		typeof obj.lastEditedBy === 'string' &&
		'lastEditedAt' in obj &&
		typeof obj.lastEditedAt === 'string'
	);
}
