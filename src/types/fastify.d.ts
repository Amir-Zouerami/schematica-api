import type { User } from '@prisma/client';
import 'fastify';

type UserInRequest = Omit<User, 'password'>;

export interface UploadedFile {
	fieldname: string;
	originalname: string;
	mimetype: string;
	path: string;
	size: number;
}

// Use declaration merging to add all our custom properties to the FastifyRequest interface
declare module 'fastify' {
	export interface FastifyRequest {
		id: string;
		user?: UserInRequest;
		uploadedFile?: UploadedFile;
	}
}
