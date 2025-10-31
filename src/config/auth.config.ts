import { getEnv, getEnvInt } from './env.helper';

export interface AuthConfig {
	auth: {
		secret: string;
		expirationTime: string;
		saltRounds: number;
	};
}

export default (): AuthConfig => {
	return {
		auth: {
			secret: getEnv('JWT_SECRET'),
			expirationTime: getEnv('JWT_EXPIRATION_TIME'),
			saltRounds: getEnvInt('SALT_ROUNDS', 10),
		},
	};
};
