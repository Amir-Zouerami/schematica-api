import { getEnv } from './env.helper';

export interface DbConfig {
	database: {
		url: string;
	};
}

export default (): DbConfig => {
	return {
		database: {
			url: getEnv('DATABASE_URL'),
		},
	};
};
