import { defineConfig } from 'prisma/config';

export default defineConfig({
	migrations: {
		seed: 'bun prisma/seed.ts',
	},
});
