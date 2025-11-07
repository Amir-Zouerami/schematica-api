import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile as GitLabProfile, GitLabStrategy } from 'passport-gitlab-ts';
import { AllConfigTypes } from 'src/config/config.type';
import { UserWithTeams } from 'src/users/users.types';
import { AuthService } from '../auth.service';

@Injectable()
export class GitLabStrategyFastify extends PassportStrategy(GitLabStrategy, 'gitlab') {
	constructor(
		private readonly authService: AuthService,
		configService: ConfigService<AllConfigTypes, true>,
	) {
		const gitlabConfig = configService.get('oauth.gitlab', { infer: true });
		super({
			clientID: gitlabConfig.clientID,
			clientSecret: gitlabConfig.clientSecret,
			callbackURL: gitlabConfig.callbackURL,
			baseUrl: gitlabConfig.baseURL,
			scope: ['read_user'],
		});
	}

	async validate(
		_accessToken: string,
		_refreshToken: string,
		profile: GitLabProfile,
	): Promise<UserWithTeams> {
		const { id, username, emails } = profile;

		if (!username) {
			throw new UnauthorizedException(
				'Could not authenticate. GitLab profile must have a username.',
			);
		}

		const user = await this.authService.validateOAuthUser({
			provider: 'gitlab',
			providerId: String(id),
			username: username,
			email: emails?.[0]?.value ?? null,
		});

		if (!user) {
			throw new UnauthorizedException('Could not process user authentication.');
		}

		return user;
	}
}
