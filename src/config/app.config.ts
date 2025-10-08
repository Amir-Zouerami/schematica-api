import { getEnv, getEnvInt } from './env.helper';

export interface AppConfig {
	app: {
		nodeEnv: string;
		port: number;
		title: string;
		description: string;
		version: string;
		tag: string;
		serverUrl: string;
		globalPrefix: string;
		docsPath: string;
		corsOrigin: string;
	};
}

export default (): AppConfig => {
	return {
		app: {
			nodeEnv: getEnv('NODE_ENV'),
			port: getEnvInt('PORT'),
			title: getEnv('APP_TITLE'),
			description: getEnv('APP_DESCRIPTION'),
			version: getEnv('APP_VERSION'),
			tag: getEnv('APP_TAG'),
			serverUrl: getEnv('APP_SERVER_URL'),
			globalPrefix: getEnv('APP_GLOBAL_PREFIX'),
			docsPath: getEnv('APP_DOCS_PATH'),
			corsOrigin: getEnv('CORS_ORIGIN'),
		},
	};
};
