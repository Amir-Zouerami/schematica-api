import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { compare } from 'bcrypt';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserWithTeams } from 'src/users/users.types';
import { USERNAME_SUFFIXES } from './constants/username-suffixes.constants';
import { OAuthUserDto } from './dto/oauth-user.dto';

@Injectable()
export class AuthService {
	constructor(
		private readonly prismaService: PrismaService,
		private readonly jwtService: JwtService,
		private readonly logger: PinoLogger,
	) {
		this.logger.setContext(AuthService.name);
	}

	/**
	 * Validates a user's credentials for local (password-based) authentication.
	 *
	 * @param username The user's username.
	 * @param passwordPlainText The user's plain-text password.
	 * @returns The user object without the password if validation is successful, otherwise null.
	 */
	async validateUser(
		username: string,
		passwordPlainText: string,
	): Promise<Omit<User, 'password'> | null> {
		const user = await this.prismaService.user.findUnique({
			where: { username },
		});

		if (!user || !user.password) {
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
	 * Finds a user associated with an OAuth provider or creates a new one (JIT Provisioning).
	 * This logic is secure: it prioritizes the immutable provider ID for lookups. If a new user
	 * must be created and their desired username is taken, it resolves the collision by
	 * appending a thematic suffix.
	 *
	 * @param details The user details provided by the OAuth provider.
	 * @returns The full user object, including teams, ready for JWT generation, or null on failure.
	 */
	async validateOAuthUser(details: OAuthUserDto): Promise<UserWithTeams | null> {
		const { provider, providerId, username } = details;

		try {
			const existingAuthProvider = await this.prismaService.authProvider.findUnique({
				where: { provider_providerId: { provider, providerId } },
				include: {
					user: {
						include: { teamMemberships: { select: { team: true } } },
					},
				},
			});

			if (existingAuthProvider) {
				const { password: _, ...user } = existingAuthProvider.user;
				return { ...user, teams: user.teamMemberships.map((m) => m.team) };
			}

			const uniqueUsername = await this.findAvailableUsername(username);

			const newUser = await this.prismaService.user.create({
				data: {
					username: uniqueUsername,
					authProviders: {
						create: {
							provider,
							providerId,
						},
					},
				},
				include: {
					teamMemberships: { select: { team: true } },
				},
			});

			this.logger.info(`Provisioned new user '${uniqueUsername}' via ${provider} OAuth.`);

			const { password: _, ...result } = newUser;
			return { ...result, teams: [] };
		} catch (error: unknown) {
			this.logger.error({ error, provider, providerId }, 'OAuth user validation failed.');
			return null;
		}
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

	/**
	 * Finds a unique, available username. If the base username is taken, it attempts
	 * to append a thematic suffix chosen from a random starting point in our list.
	 * If all suffixes are exhausted (highly unlikely), it falls back to a numeric counter.
	 *
	 * @param baseUsername The desired username from the OAuth provider.
	 * @returns A username that is guaranteed to be unique in the database.
	 */
	private async findAvailableUsername(baseUsername: string): Promise<string> {
		const user = await this.prismaService.user.findUnique({
			where: { username: baseUsername },
		});
		if (!user) {
			return baseUsername;
		}

		const suffixCount = USERNAME_SUFFIXES.length;
		const startIndex = Math.floor(Math.random() * suffixCount);

		for (let i = 0; i < suffixCount; i++) {
			const suffix = USERNAME_SUFFIXES[(startIndex + i) % suffixCount];
			const newUsername = `${baseUsername}${suffix}`;

			// biome-ignore lint/performance/noAwaitInLoops: Sequential behaviour is natural in this case.
			const user = await this.prismaService.user.findUnique({
				where: { username: newUsername },
			});

			if (!user) {
				return newUsername;
			}
		}

		let username = '';
		let counter = 1;
		while (true) {
			username = `${baseUsername}${counter}`;

			// biome-ignore lint/performance/noAwaitInLoops: Sequential check is required.
			const user = await this.prismaService.user.findUnique({ where: { username } });

			if (!user) {
				return username;
			}

			counter++;
		}
	}
}
