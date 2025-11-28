import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';
import { AllConfigTypes } from 'src/config/config.type';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserWithTeams } from 'src/users/users.types';

export interface JwtPayload {
	sub: string;
	username: string;
	role: string;
	tokenVersion: number;
}

@Injectable()
export class JwtStrategyFastify extends PassportStrategy(JwtStrategy, 'jwt') {
	constructor(
		private readonly prisma: PrismaService,
		configService: ConfigService<AllConfigTypes, true>,
	) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			secretOrKey: configService.get('auth.secret', { infer: true }),
			ignoreExpiration: false,
		});
	}

	async validate(payload: JwtPayload): Promise<UserWithTeams & { hasPassword: boolean }> {
		const user = await this.prisma.user.findUnique({
			where: { id: payload.sub },
			include: { teamMemberships: { select: { team: true } } },
		});

		if (!user) {
			throw new UnauthorizedException('User not found');
		}
		if (user.tokenVersion !== payload.tokenVersion) {
			throw new UnauthorizedException('Token is no longer valid');
		}

		const hasPassword = user.password !== null;
		const { password: _, teamMemberships, ...safe } = user;

		return {
			...safe,
			teams: teamMemberships.map((m) => m.team),
			hasPassword,
		};
	}
}
