/**
 * A centralized enum for Prisma's known request error codes.
 * This prevents the use of "magic strings" and provides a single source of truth.
 *
 * @see https://www.prisma.io/docs/reference/api-reference/error-reference#error-codes
 */
export enum PrismaErrorCode {
	/**
	 * Unique constraint failed on one or more fields.
	 */
	UniqueConstraintFailed = 'P2002',

	/**
	 * An operation failed because it depends on one or more records that were required but not found.
	 * Used for "Record to update not found" or "Record to delete not found".
	 * This is our key for detecting optimistic concurrency failures and simple "not found" errors.
	 */
	RecordNotFound = 'P2025',
}
