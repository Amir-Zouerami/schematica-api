import { User } from '@prisma/client';
import 'fastify';
import { UserWithTeams } from 'src/users/users.types';

type UserInRequest = Omit<User, 'password'>;

export interface UploadedFile {
	fieldname: string;
	originalname: string;
	mimetype: string;
	path: string;
	size: number;
}

declare module 'fastify' {
	export interface FastifyRequest {
		id: string;
		user?: UserInRequest;
		uploadedFile?: UploadedFile;

		// Methods added by @fastify/passport
		logIn(user: UserWithTeams): Promise<void>;
		logOut(): void;
	}
}
