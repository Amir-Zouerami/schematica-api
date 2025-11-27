import { Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { AllConfigTypes } from 'src/config/config.type';
import { UserWithTeams } from 'src/users/users.types';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginResponseDto } from './dto/login-response.dto';
import { LoginDto } from './dto/login.dto';
import { MeDto } from './dto/me.dto';
import { UserDto } from './dto/user.dto';
import { GitLabAuthGuard } from './guards/gitlab-auth.guard';
import { GitLabCallbackGuard } from './guards/gitlab-callback.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly configService: ConfigService<AllConfigTypes, true>,
	) {}

	@Get('gitlab')
	@UseGuards(GitLabAuthGuard)
	gitlabAuth() {
		// This route is handled by the GitLabAuthGuard, which will
		// perform the redirect. This handler will never be reached.
	}

	@Get('gitlab/callback')
	@UseGuards(GitLabCallbackGuard)
	gitlabAuthCallback(@Res() res: FastifyReply, @CurrentUser() user: UserDto) {
		const { access_token } = this.authService.login(user);
		const redirectUrl = this.configService.get('app.oauthRedirectUrl', { infer: true });

		const finalUrl = new URL(redirectUrl);
		finalUrl.searchParams.set('token', access_token);

		res.redirect(finalUrl.toString(), 302);
	}

	@ApiBody({ type: LoginDto })
	@UseGuards(LocalAuthGuard)
	@Post('login')
	@ApiOkResponse({
		description: 'User successfully logged in.',
		type: LoginResponseDto,
	})
	login(@CurrentUser() user: UserDto) {
		return this.authService.login(user);
	}

	@ApiBearerAuth()
	@UseGuards(JwtAuthGuard)
	@Get('me')
	@ApiOkResponse({
		description: 'The authenticated user profile.',
		type: MeDto,
	})
	getProfile(@CurrentUser() user: UserWithTeams & { hasPassword: boolean }): MeDto {
		return new MeDto(user);
	}
}
