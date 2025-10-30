export interface EndpointNote {
	content: string;
	createdBy: string;
	createdAt: string;
}

export interface EndpointAppMetadata {
	createdBy?: string;
	createdAt?: string;
	lastEditedBy?: string;
	lastEditedAt?: string;
	notes?: EndpointNote[];
}

/**
 * Type guard to check if an object conforms to our metadata structure.
 *
 * @param obj potential endpoint metadata
 * @returns { boolean }
 */
export function isEndpointAppMetadata(obj: unknown): obj is EndpointAppMetadata {
	// for now a simple object check is enough
	if (typeof obj !== 'object' || obj === null) {
		return false;
	}

	return true;
}
