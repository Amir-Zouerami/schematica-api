import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { User } from '@prisma/client';
import { Strategy as LocalStrategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategyFastify extends PassportStrategy(LocalStrategy, 'local') {
	constructor(private readonly authService: AuthService) {
		super();
	}

	async validate(username: string, password: string): Promise<Omit<User, 'password'>> {
		const user = await this.authService.validateUser(username, password);
		if (!user) {
			throw new UnauthorizedException('Invalid credentials');
		}
		return user;
	}
}
