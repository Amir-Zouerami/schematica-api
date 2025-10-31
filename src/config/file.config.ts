export interface FileConfig {
	file: {
		destination: string;
	};
}

export default (): FileConfig => {
	return {
		file: {
			destination: process.env.UPLOAD_DESTINATION || './public/uploads',
		},
	};
};
