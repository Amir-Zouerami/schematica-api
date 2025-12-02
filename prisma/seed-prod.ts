// biome-ignore-all lint/suspicious/noConsole: allow console for debugging the seed script
// biome-ignore-all lint/performance/noAwaitInLoops: allow in seeding script

import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
	const adminUsername = process.env.INITIAL_ADMIN_USERNAME;
	const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;

	if (!adminUsername || !adminPassword) {
		console.warn(
			'⚠️  Skipping Admin creation: INITIAL_ADMIN_USERNAME or INITIAL_ADMIN_PASSWORD not set.',
		);
	} else {
		console.log('⚙️  Bootstrapping Admin...');
		const teams = ['leadership', 'backend', 'frontend', 'devops'];

		// 1. Create Basic Teams
		for (const teamId of teams) {
			await prisma.team.upsert({
				where: { id: teamId },
				update: {},
				create: { id: teamId, name: teamId.charAt(0).toUpperCase() + teamId.slice(1) },
			});
		}

		// 2. Create Root Admin
		const hashedPassword = await hash(adminPassword, 10);
		await prisma.user.upsert({
			where: { username: adminUsername },
			update: { role: Role.admin },
			create: {
				username: adminUsername,
				password: hashedPassword,
				role: Role.admin,
				teamMemberships: {
					create: teams.map((t) => ({ team: { connect: { id: t } } })),
				},
			},
		});
		console.log(`✅ Root Admin '${adminUsername}' ensured.`);
	}

	// 3. Ensure "Unknown User" exists (For handling deletions safely)
	await prisma.user.upsert({
		where: { id: 'unknown-user' },
		update: {},
		create: {
			id: 'unknown-user',
			username: 'unknown',
			role: Role.guest,
			password: null,
			profileImage: null,
		},
	});
	console.log('✅ System User ensured.');
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => await prisma.$disconnect());
