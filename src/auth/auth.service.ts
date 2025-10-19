import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import { compare } from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthService {
	constructor(
		private prismaService: PrismaService,
		private jwtService: JwtService,
	) {}

	/**
	 * Validates a user's credentials.
	 *
	 * @param username The user's username.
	 * @param pass The user's plain-text password.
	 * @returns The user object without the password if validation is successful, otherwise null.
	 */
	async validateUser(
		username: string,
		passwordPlainText: string,
	): Promise<Omit<User, 'password'> | null> {
		const user = await this.prismaService.user.findUnique({
			where: { username },
		});

		if (!user) {
			return null;
		}

		const passwordsMatch = await compare(passwordPlainText, user.password);

		if (passwordsMatch) {
			const { password: _, ...result } = user;
			return result;
		}

		return null;
	}

	/**
	 * Generates a JWT for a given user.
	 *
	 * @param user The user object (without the password).
	 * @returns An object containing the access token.
	 */
	login(user: Omit<User, 'password'>) {
		const payload = {
			username: user.username,
			sub: user.id,
			role: user.role,
			tokenVersion: user.tokenVersion,
		};

		return {
			access_token: this.jwtService.sign(payload),
		};
	}
}
