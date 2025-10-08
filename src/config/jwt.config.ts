import { getEnv } from './env.helper';

export interface JwtConfig {
	jwt: {
		secret: string;
		expirationTime: string;
	};
}

export default (): JwtConfig => {
	return {
		jwt: {
			secret: getEnv('JWT_SECRET'),
			expirationTime: getEnv('JWT_EXPIRATION_TIME'),
		},
	};
};
