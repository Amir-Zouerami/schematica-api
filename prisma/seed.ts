// biome-ignore-all lint/suspicious/noConsole: allow console for debugging the seed script
// biome-ignore-all lint/performance/noAwaitInLoops: allow in seeding script

import { AccessType, PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import { createCipheriv, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// --- Encryption Helper ---
// A self-contained encryption function is needed because we can't import the NestJS
// EncryptionService into this standalone script. This logic mirrors the service.
const ENCRYPTION_KEY = Buffer.from(
	process.env.ENCRYPTION_KEY ??
		'0000000000000000000000000000000000000000000000000000000000000000', // Default for safety
	'hex',
);
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function encrypt(plainText: string): string {
	if (!process.env.ENCRYPTION_KEY) {
		console.warn('⚠️ ENCRYPTION_KEY not set. Using a default, insecure key for seeding.');
	}
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
	const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
	const authTag = cipher.getAuthTag();
	return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

// --- Type Definitions ---
type SeedTeam = {
	id: string;
	name: string;
};

type SeedUser = {
	id: string;
	username: string;
	password?: string;
	role: 'admin' | 'member' | 'guest';
	profileImage: string | null;
	teams: string[];
};

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

/**
 * Seeds team data from the JSON file.
 */
async function seedTeams() {
	console.log('Seeding teams...');
	const teamsPath = join(__dirname, 'seed-data', 'teams.json');
	const teamsRaw = await readFile(teamsPath, 'utf-8');
	const teamsData = JSON.parse(teamsRaw) as SeedTeam[];

	await Promise.all(
		teamsData.map((teamData) =>
			prisma.team.upsert({
				where: { id: teamData.id },
				update: { name: teamData.name },
				create: teamData,
			}),
		),
	);
	console.log('Teams seeded successfully.');
}

/**
 * Seeds initial users, handling both password-based and OAuth-provisioned users.
 */
async function seedUsers() {
	console.log('Seeding users...');
	const usersPath = join(__dirname, 'seed-data', 'users.json');
	const usersRaw = await readFile(usersPath, 'utf-8');
	const usersData = JSON.parse(usersRaw) as SeedUser[];

	for (const userData of usersData) {
		const hashedPassword = userData.password
			? await hash(userData.password, SALT_ROUNDS)
			: null;

		const user = await prisma.user.upsert({
			where: { username: userData.username },
			update: {},
			create: {
				id: userData.id,
				username: userData.username,
				password: hashedPassword,
				role: userData.role,
				profileImage: userData.profileImage,
				teamMemberships: {
					create: userData.teams.map((teamId: string) => ({
						team: { connect: { id: teamId } },
					})),
				},
			},
		});

		if (!userData.password) {
			await prisma.authProvider.upsert({
				where: {
					provider_providerId: { provider: 'gitlab', providerId: `seed-${user.id}` },
				},
				update: {},
				create: { provider: 'gitlab', providerId: `seed-${user.id}`, userId: user.id },
			});
			console.log(`   - Created OAuth provider link for user: ${user.username}`);
		}
	}
	console.log('Users seeded successfully.');
}

/**
 * Seeds multiple projects with environments, encrypted secrets, and endpoints with varied statuses.
 */
async function seedProjects() {
	console.log('Seeding projects...');

	await prisma.$transaction(async (tx) => {
		// --- Find Reusable Users & Teams ---
		const amir = await tx.user.findUniqueOrThrow({ where: { id: '1' } });
		const brooklyn = await tx.user.findUniqueOrThrow({ where: { id: '2' } });
		const leadershipTeam = await tx.team.findUniqueOrThrow({ where: { id: 'leadership' } });
		const uiTeam = await tx.team.findUniqueOrThrow({ where: { id: 'ui' } });
		const backendTeam = await tx.team.findUniqueOrThrow({ where: { id: 'backend' } });

		// =================================================================
		// --- Project 1: Project Nova (Our "Golden" Spec for Mocking) ---
		// =================================================================
		const projectNova = await tx.project.upsert({
			where: { nameNormalized: 'project nova' },
			update: {},
			create: {
				name: 'Project Nova',
				nameNormalized: 'project nova',
				description: 'A comprehensive, public-facing User & Profile API.',
				serverUrl: 'https://api.nova.test',
				creatorId: amir.id,
				updatedById: amir.id,
				links: {
					create: {
						name: 'GitLab Milestone',
						url: 'https://gitlab.com/example/schematica/-/milestones/1',
					},
				},
				deniedUsers: { connect: { id: '3' } }, // Deny charlie.davis
				userAccesses: { create: [{ userId: amir.id, type: AccessType.OWNER }] },
				teamAccesses: {
					create: [
						{ teamId: leadershipTeam.id, type: AccessType.OWNER },
						{ teamId: backendTeam.id, type: AccessType.OWNER },
						{ teamId: uiTeam.id, type: AccessType.VIEWER },
					],
				},
			},
		});

		// --- Endpoints for Project Nova (RICH DATA for MOCKING) ---
		const novaUserListEndpoint = await tx.endpoint.create({
			data: {
				path: '/users',
				method: 'get',
				status: 'PUBLISHED',
				projectId: projectNova.id,
				creatorId: amir.id,
				updatedById: amir.id,
				operation: {
					tags: ['Users'],
					summary: 'List All Users',
					description: 'Retrieves a paginated list of all users in the system.',
					responses: {
						'200': {
							description: 'A paginated list of users.',
							content: {
								'application/json': {
									schema: {
										type: 'array',
										items: { $ref: '#/components/schemas/User' },
									},
								},
							},
						},
					},
				},
			},
		});

		// Add a note to the endpoint we just created
		await tx.note.create({
			data: {
				content:
					'This endpoint needs to be updated to include a search parameter for Q4. @david.chen can you look into this?',
				endpointId: novaUserListEndpoint.id,
				authorId: brooklyn.id,
			},
		});

		await tx.endpoint.create({
			data: {
				path: '/users/{userId}',
				method: 'get',
				status: 'PUBLISHED',
				projectId: projectNova.id,
				creatorId: amir.id,
				updatedById: amir.id,
				operation: {
					tags: ['Users'],
					summary: 'Get User by ID',
					parameters: [
						{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
					],
					responses: {
						'200': {
							description: 'User details found.',
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/User' },
								},
							},
						},
						'404': {
							description: 'User not found.',
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/ErrorResponse' },
								},
							},
						},
					},
				},
			},
		});

		await tx.endpoint.create({
			data: {
				path: '/users',
				method: 'post',
				status: 'PUBLISHED',
				projectId: projectNova.id,
				creatorId: amir.id,
				updatedById: amir.id,
				operation: {
					tags: ['Users'],
					summary: 'Create a new user',
					responses: {
						'201': {
							description: 'User created successfully.',
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/User' },
								},
							},
						},
						'409': {
							description: 'User with this username already exists.',
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/ErrorResponse' },
								},
							},
						},
					},
				},
			},
		});

		// --- Reusable Schema Components for Project Nova (with x-faker) ---
		await tx.schemaComponent.createMany({
			data: [
				{
					name: 'User',
					description: 'A standard user object.',
					schema: {
						type: 'object',
						properties: {
							id: { type: 'string', format: 'uuid', 'x-faker': 'string.uuid' },
							firstName: { type: 'string', 'x-faker': 'person.firstName' },
							lastName: { type: 'string', 'x-faker': 'person.lastName' },
							username: { type: 'string', 'x-faker': 'internet.userName' },
						},
						required: ['id', 'firstName', 'lastName', 'username'],
					},
					projectId: projectNova.id,
					creatorId: amir.id,
					updatedById: amir.id,
				},
				{
					name: 'ErrorResponse',
					description: 'A standard error response object.',
					schema: {
						type: 'object',
						properties: {
							statusCode: { type: 'integer' },
							message: { type: 'string', 'x-faker': 'lorem.sentence' },
							error: { type: 'string' },
						},
						required: ['statusCode', 'message'],
					},
					projectId: projectNova.id,
					creatorId: brooklyn.id,
					updatedById: brooklyn.id,
				},
			],
		});

		// --- Environments & Secrets for Project Nova ---
		const novaStaging = await tx.environment.create({
			data: { name: 'Staging', projectId: projectNova.id },
		});
		const novaProd = await tx.environment.create({
			data: { name: 'Production', projectId: projectNova.id },
		});
		await tx.secret.createMany({
			data: [
				{
					key: 'DATABASE_URL',
					value: encrypt('postgres://user:pass@staging-db.nova:5432/main'),
					environmentId: novaStaging.id,
				},
				{
					key: 'STRIPE_API_KEY',
					value: encrypt('sk_test_123456789_staging'),
					environmentId: novaStaging.id,
				},
				{
					key: 'DATABASE_URL',
					value: encrypt('postgres://user:pass@prod-db.nova:5432/main'),
					environmentId: novaProd.id,
				},
				{
					key: 'STRIPE_API_KEY',
					value: encrypt('sk_live_987654321_prod'),
					environmentId: novaProd.id,
				},
			],
		});

		// =================================================================
		// --- Project 2: Project Apollo (Internal API) ---
		// =================================================================
		const projectApollo = await tx.project.upsert({
			where: { nameNormalized: 'project apollo' },
			update: {},
			create: {
				name: 'Project Apollo',
				nameNormalized: 'project apollo',
				description: 'Internal-facing API for the mobile team.',
				serverUrl: 'https://internal.api.apollo.test',
				creatorId: brooklyn.id,
				updatedById: brooklyn.id,
				userAccesses: { create: [{ userId: brooklyn.id, type: AccessType.OWNER }] },
				teamAccesses: {
					create: [
						{ teamId: 'mobile', type: AccessType.OWNER },
						{ teamId: 'qa', type: AccessType.VIEWER },
					],
				},
			},
		});

		// --- Endpoints for Project Apollo (different structure and statuses) ---
		await tx.endpoint.createMany({
			data: [
				{
					path: '/sessions',
					method: 'post',
					status: 'PUBLISHED',
					projectId: projectApollo.id,
					creatorId: brooklyn.id,
					updatedById: brooklyn.id,
					operation: {
						tags: ['Authentication'],
						summary: 'Create a Session',
						responses: { '201': { description: 'Session created.' } },
					},
				},
				{
					path: '/profile/settings',
					method: 'put',
					status: 'IN_REVIEW',
					projectId: projectApollo.id,
					creatorId: brooklyn.id,
					updatedById: brooklyn.id,
					operation: {
						tags: ['Profile'],
						summary: "Update User's Settings",
						responses: { '200': { description: 'Settings updated.' } },
					},
				},
				{
					path: '/diagnostics/health',
					method: 'get',
					status: 'DRAFT',
					projectId: projectApollo.id,
					creatorId: brooklyn.id,
					updatedById: brooklyn.id,
					operation: {
						tags: ['Diagnostics'],
						summary: 'Health Check',
						responses: { '200': { description: 'Service is healthy.' } },
					},
				},
			],
		});
	});

	console.log('Projects and related data seeded successfully.');
}

/**
 * Orchestrates the full database seeding process.
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
