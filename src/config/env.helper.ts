export const getEnv = (name: string): string => {
	const value = process.env[name];

	if (!value) {
		throw new Error(`Missing environment variable: ${name}`);
	}

	return value;
};

export const getEnvInt = (name: string, defaultValue?: number): number => {
	const value = process.env[name];
	if (!value) {
		if (defaultValue !== undefined) return defaultValue;
		throw new Error(`Missing environment variable: ${name}`);
	}

	const parsed = parseInt(value, 10);

	if (Number.isNaN(parsed)) {
		throw new Error(`Environment variable ${name} must be a number`);
	}

	return parsed;
};
