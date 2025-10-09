import "fastify";

// Use declaration merging to add our custom 'id' property to the FastifyRequest interface
declare module "fastify" {
	export interface FastifyRequest {
		id: string;
	}
}
