import type { User } from '@prisma/client';
import 'fastify';

type UserInRequest = Omit<User, 'password'>;

// Use declaration merging to add our custom 'id' property, etc. to the FastifyRequest interface
declare module 'fastify' {
	export interface FastifyRequest {
		id: string;
		user?: UserInRequest;
	}
}
