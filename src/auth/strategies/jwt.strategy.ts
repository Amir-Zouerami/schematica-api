import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';

import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AllConfigTypes } from 'src/config/config.type';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserWithTeams } from 'src/users/users.types';

export type JwtPayload = {
	sub: string;
	username: string;
	role: string;
	tokenVersion: number;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(
		private readonly prismaService: PrismaService,
		configService: ConfigService<AllConfigTypes, true>,
	) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: configService.get('auth.secret', { infer: true }),
		});
	}

	/**
	 * This method is called by Passport after it has successfully verified the token's
	 * signature and expiration.
	 *
	 * @param payload The decoded payload from the JWT.
	 * @returns The user object that will be attached to the request.
	 */
	async validate(payload: JwtPayload): Promise<UserWithTeams> {
		const user = await this.prismaService.user.findUnique({
			where: { id: payload.sub },
			include: {
				teamMemberships: { select: { team: true } },
			},
		});

		if (!user) {
			throw new UnauthorizedException('User not found.');
		}

		if (user.tokenVersion !== payload.tokenVersion) {
			throw new UnauthorizedException('Token is no longer valid.');
		}

		const { password: _, teamMemberships, ...result } = user;
		return {
			...result,
			teams: teamMemberships.map((m) => m.team),
		};
	}
}
