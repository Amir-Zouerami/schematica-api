import { getEnv } from './env.helper';

export interface OAuthConfig {
	oauth: {
		gitlab: {
			baseURL: string;
			clientID: string;
			clientSecret: string;
			callbackURL: string;
		};
	};
}

export default (): OAuthConfig => ({
	oauth: {
		gitlab: {
			baseURL: getEnv('GITLAB_BASE_URL'),
			clientID: getEnv('GITLAB_CLIENT_ID'),
			clientSecret: getEnv('GITLAB_CLIENT_SECRET'),
			callbackURL: getEnv('GITLAB_CALLBACK_URL'),
		},
	},
});
