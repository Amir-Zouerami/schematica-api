import { Team, User } from '@prisma/client';

export type SanitizedUser = {
	id: string;
	username: string;
	profileImage: string | null;
};

export type UserWithTeams = Omit<User, 'password'> & {
	teams: Team[];
};
