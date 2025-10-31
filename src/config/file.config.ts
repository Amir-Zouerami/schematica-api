import { getEnv } from './env.helper';

export interface FileConfig {
	file: {
		destination: string;
	};
}

export default (): FileConfig => {
	return {
		file: {
			destination: getEnv('UPLOAD_DESTINATION') || './public/uploads',
		},
	};
};
