// biome-ignore-all lint/suspicious/noConsole: allow console for debugging the seed script
// biome-ignore-all lint/performance/noAwaitInLoops: allow in seeding script

import { AccessType, PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcrypt';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

type SeedUser = {
	id: string;
	username: string;
	password: string;
	role: 'admin' | 'member';
	profileImage: string | null;
	teams: string[];
};

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

/**
 * Create or update the initial teams in the database.
 *
 * Upserts three teams with ids "backend", "leadership", and "UI", ensuring their names are set to "Backend", "Leadership", and "UI" respectively.
 */
async function seedTeams() {
	console.log('Seeding teams...');
	const teamsToCreate = [
		{ id: 'backend', name: 'Backend' },
		{ id: 'leadership', name: 'Leadership' },
		{ id: 'UI', name: 'UI' },
	];

	for (const teamData of teamsToCreate) {
		await prisma.team.upsert({
			where: { id: teamData.id },
			update: { name: teamData.name },
			create: teamData,
		});
	}
	console.log('Teams seeded successfully.');
}

/**
 * Seed initial users from seed-data/users.json into the database.
 *
 * Reads the JSON file, hashes each user's password, and upserts user records by username.
 * New users are created with the provided id, username, hashed password, role, profile image,
 * and team memberships connected to the specified team IDs.
 */
async function seedUsers() {
	console.log('Seeding users...');
	const usersPath = join(__dirname, 'seed-data', 'users.json');
	const usersRaw = await readFile(usersPath, 'utf-8');
	const usersData = JSON.parse(usersRaw) as SeedUser[];

	for (const userData of usersData) {
		const hashedPassword = await hash(userData.password, SALT_ROUNDS);

		await prisma.user.upsert({
			where: { username: userData.username },
			update: {},
			create: {
				id: userData.id,
				username: userData.username,
				password: hashedPassword,
				role: userData.role === 'admin' ? Role.admin : Role.member,
				profileImage: userData.profileImage,
				teamMemberships: {
					create: userData.teams.map((teamId: string) => ({
						team: { connect: { id: teamId } },
					})),
				},
			},
		});
	}
	console.log('Users seeded successfully.');
}

/**
 * Seed the "Project Nova" project along with its related records and access rules.
 *
 * Creates the project (including a link and a denied user), configures team access
 * (leadership as OWNER, UI as VIEWER), adds two endpoints for the project, and
 * attaches a note to one endpoint — all executed inside a database transaction.
 */
async function seedProjects() {
	console.log('Seeding projects...');

	await prisma.$transaction(async (tx) => {
		const amir = await tx.user.findUniqueOrThrow({ where: { id: '1' } });
		const brooklyn = await tx.user.findUniqueOrThrow({
			where: { id: '2' },
		});
		const leadershipTeam = await tx.team.findUniqueOrThrow({
			where: { id: 'leadership' },
		});
		const uiTeam = await tx.team.findUniqueOrThrow({ where: { id: 'UI' } });

		const projectNova = await tx.project.upsert({
			where: { nameNormalized: 'project nova' },
			update: {},
			create: {
				name: 'Project Nova',
				nameNormalized: 'project nova',
				description: 'A test project for the UI team.',
				serverUrl: 'https://api.nova.test',
				creatorId: amir.id,
				updatedById: amir.id,
				links: {
					create: [
						{
							name: 'GitLab Milestone',
							url: 'https://gitlab.com/example/schematica/-/milestones/1',
						},
					],
				},
				deniedUsers: {
					connect: { id: '3' }, // Deny charlie.davis
				},
			},
		});

		// --- Set Access Rules for Project Nova ---
		await tx.teamProjectAccess.upsert({
			where: {
				teamId_projectId: {
					teamId: leadershipTeam.id,
					projectId: projectNova.id,
				},
			},
			update: {},
			create: {
				teamId: leadershipTeam.id,
				projectId: projectNova.id,
				type: AccessType.OWNER,
			},
		});

		await tx.teamProjectAccess.upsert({
			where: {
				teamId_projectId: {
					teamId: uiTeam.id,
					projectId: projectNova.id,
				},
			},
			update: {},
			create: {
				teamId: uiTeam.id,
				projectId: projectNova.id,
				type: AccessType.VIEWER,
			},
		});

		// --- Create Endpoints for Project Nova ---
		await tx.endpoint.create({
			data: {
				path: '/',
				method: 'get',
				operation: {
					summary: 'List API versions',
					responses: {
						'200': { description: 'A list of API versions.' },
					},
				},
				projectId: projectNova.id,
				creatorId: amir.id,
				updatedById: amir.id,
			},
		});

		const getVersionDetailsEndpoint = await tx.endpoint.create({
			data: {
				path: '/v2',
				method: 'get',
				operation: {
					summary: 'Show API version details',
					responses: {
						'200': { description: 'Details for API v2.' },
					},
				},
				projectId: projectNova.id,
				creatorId: amir.id,
				updatedById: amir.id,
			},
		});

		// --- Add a note to an endpoint ---
		await tx.note.create({
			data: {
				content: 'This endpoint is deprecated and will be removed in Q4.',
				endpointId: getVersionDetailsEndpoint.id,
				authorId: brooklyn.id,
			},
		});
	});

	console.log('Projects and related data seeded successfully.');
}

/**
 * Orchestrates the full database seeding process by running team, user, and project seed tasks in order.
 *
 * Executes seedTeams, seedUsers, and seedProjects sequentially to populate initial data.
 */
async function main() {
	console.log('Starting seed process...');
	await seedTeams();
	await seedUsers();
	await seedProjects();
	console.log('Seeding finished.');
}

main()
	.catch((e) => {
		console.error('An error occurred during seeding:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});