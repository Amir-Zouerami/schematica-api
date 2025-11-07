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
		logRetentionDays: number;
		websocketPath: string;
		lockDurationMs: number;
		lockCleanupIntervalMs: number;
		oauthRedirectUrl: string;
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
			logRetentionDays: getEnvInt('LOG_RETENTION_DAYS', 90),
			websocketPath: getEnv('WEBSOCKET_PATH'),
			lockDurationMs: getEnvInt('LOCK_DURATION_MS', 180000),
			lockCleanupIntervalMs: getEnvInt('LOCK_CLEANUP_INTERVAL_MS', 60000),
			oauthRedirectUrl: getEnv('OAUTH_REDIRECT_SUCCESS_URL'),
		},
	};
};
