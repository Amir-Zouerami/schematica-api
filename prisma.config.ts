import { defineConfig } from 'prisma/config';

const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
	migrations: {
		seed: isProduction ? 'bun prisma/seed-prod.ts' : 'bun prisma/seed.ts',
	},
});
