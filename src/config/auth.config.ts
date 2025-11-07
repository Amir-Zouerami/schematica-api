import { getEnv, getEnvInt } from './env.helper';

export interface AuthConfig {
	auth: {
		secret: string;
		sessionSecret: string;
		sessionSalt: string;
		expirationTime: string;
		saltRounds: number;
	};
}

export default (): AuthConfig => {
	return {
		auth: {
			secret: getEnv('JWT_SECRET'),
			sessionSecret: getEnv('SESSION_SECRET'),
			sessionSalt: getEnv('SESSION_SALT'),
			expirationTime: getEnv('JWT_EXPIRATION_TIME'),
			saltRounds: getEnvInt('SALT_ROUNDS', 10),
		},
	};
};
