export interface RequestMeta {
	requestId: string;
	apiVersion: string;
	timestamp: string;
}

export interface PaginationMeta {
	total: number;
	page: number;
	limit: number;
	lastPage: number;
}

// The response structure for a standard (non-paginated) request
export interface ApiResponse<T> {
	data: T;
	meta: RequestMeta;
}

// The response structure for a paginated request
export interface PaginatedApiResponse<T> {
	data: T[];
	meta: RequestMeta & PaginationMeta;
}

// A contract for what the service layer should return for paginated data
export interface PaginatedServiceResponse<T> {
	data: T[];
	meta: PaginationMeta;
}

/**
 * Type guard that determines whether a value conforms to PaginatedServiceResponse<T>.
 *
 * @param data - Value to test for the paginated service response shape
 * @returns `true` if `data` is a PaginatedServiceResponse<T>, `false` otherwise.
 */
export function isPaginatedServiceResponse<T>(data: unknown): data is PaginatedServiceResponse<T> {
	if (typeof data !== 'object' || data === null) {
		return false;
	}

	const potentialResponse = data as Record<string, unknown>;

	const hasData = 'data' in potentialResponse && Array.isArray(potentialResponse.data);
	const hasMeta =
		'meta' in potentialResponse &&
		typeof potentialResponse.meta === 'object' &&
		potentialResponse.meta !== null;

	if (!hasData || !hasMeta) {
		return false;
	}

	const meta = potentialResponse.meta as Record<string, unknown>;
	const hasTotal = 'total' in meta && typeof meta.total === 'number';

	return hasTotal;
}
