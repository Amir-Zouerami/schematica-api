// biome-ignore-all lint/suspicious/noConsole: allow console for debugging the seed script
// biome-ignore-all lint/performance/noAwaitInLoops: allow in seeding script

import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcrypt';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

type SeedUser = {
	username: string;
	password: string;
	role: 'admin' | 'member';
	profileImage: string | null;
	teams: string[];
};

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function main() {
	console.log('Start seeding...');

	// --- Seed Teams ---
	const teamsToCreate = [
		{ id: 'backend' },
		{ id: 'leadership' },
		{ id: 'UI' },
	];

	console.log('Seeding teams...');
	for (const teamData of teamsToCreate) {
		await prisma.team.upsert({
			where: { id: teamData.id },
			update: {},
			create: {
				id: teamData.id,
				name: teamData.id,
			},
		});
	}
	console.log('Teams seeded successfully.');

	// --- Seed Users ---
	const usersPath = join(__dirname, 'seed-data', 'users.json');
	const usersRaw = await readFile(usersPath, 'utf-8');
	const usersData = JSON.parse(usersRaw) as SeedUser[];

	console.log('Seeding users...');
	for (const userData of usersData) {
		const hashedPassword = await hash(userData.password, SALT_ROUNDS);

		await prisma.user.upsert({
			where: { username: userData.username },
			update: {},
			create: {
				username: userData.username,
				password: hashedPassword,
				role: userData.role === 'admin' ? Role.admin : Role.member,
				profileImage: userData.profileImage,
				teamMemberships: {
					create: userData.teams.map((teamId: string) => ({
						team: {
							connect: {
								id: teamId,
							},
						},
					})),
				},
			},
		});
	}
	console.log('Users seeded successfully.');

	console.log('Seeding finished.');
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
