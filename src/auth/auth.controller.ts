import { Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { AllConfigTypes } from 'src/config/config.type';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
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
	gitlabAuthCallback(@CurrentUser() user: UserDto, @Res() res: FastifyReply) {
		const { access_token } = this.authService.login(user);
		const redirectUrl = this.configService.get('app.oauthRedirectUrl', { infer: true });

		const finalUrl = new URL(redirectUrl);
		finalUrl.searchParams.set('token', access_token);

		return res.redirect(finalUrl.toString());
	}

	@ApiBody({ type: LoginDto })
	@UseGuards(LocalAuthGuard)
	@Post('login')
	login(@CurrentUser() user: UserDto) {
		return this.authService.login(user);
	}

	@ApiBearerAuth()
	@UseGuards(JwtAuthGuard)
	@Get('me')
	getProfile(@CurrentUser() user: UserDto): UserDto {
		return user;
	}
}
