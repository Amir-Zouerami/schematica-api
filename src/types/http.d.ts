import 'http';

// Use declaration merging to add our custom property to Node's ServerResponse
declare module 'http' {
	interface ServerResponse {
		customProps?: {
			user?: {
				id: string;
				username: string;
			};
		};
	}
}
