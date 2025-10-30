/**
 * A set of valid HTTP methods as defined by the OpenAPI 3.0 specification Path Item Object.
 * Using a Set provides efficient O(1) lookups.
 * @see https://swagger.io/specification/#path-item-object
 */
export const VALID_HTTP_METHODS: ReadonlySet<string> = new Set([
	'get',
	'put',
	'post',
	'delete',
	'options',
	'head',
	'patch',
	'trace',
]);
