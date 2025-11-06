import { getEnv, getEnvInt } from './env.helper';

export interface EncryptionConfig {
	encryption: {
		key: string;
		algorithm: string;
		ivLength: number;
		authTagLength: number;
	};
}

export default (): EncryptionConfig => {
	const key = getEnv('ENCRYPTION_KEY');

	if (key.length !== 64) {
		throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes).');
	}

	return {
		encryption: {
			key,
			algorithm: getEnv('ENCRYPTION_ALGORITHM'),
			ivLength: getEnvInt('ENCRYPTION_IV_LENGTH', 16),
			authTagLength: getEnvInt('ENCRYPTION_AUTH_TAG_LENGTH', 16),
		},
	};
};
