import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { User } from '@prisma/client';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
	constructor(private authService: AuthService) {
		super();
	}

	/**
	 * Passport automatically calls this method with the credentials from the request body.
	 *
	 * @param username The username extracted from the request.
	 * @param password The password extracted from the request.
	 * @returns The full user object if validation is successful.
	 * @throws { UnauthorizedException } if validation fails.
	 */
	async validate(username: string, password: string): Promise<Omit<User, 'password'>> {
		const user = await this.authService.validateUser(username, password);

		if (!user) {
			throw new UnauthorizedException('Invalid credentials');
		}

		return user;
	}
}
