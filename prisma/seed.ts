// biome-ignore-all lint/suspicious/noConsole: allow console for debugging the seed script
// biome-ignore-all lint/performance/noAwaitInLoops: allow in seeding script

import { AccessType, EndpointStatus, PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcrypt';
import { createCipheriv, randomBytes } from 'node:crypto';

// --- Configuration & Helpers ---

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

// Replicating EncryptionService logic locally for seeding
// This ensures secrets in the DB are actually usable by the app
const ENCRYPTION_KEY = Buffer.from(
	process.env.ENCRYPTION_KEY ??
		'0000000000000000000000000000000000000000000000000000000000000000',
	'hex',
);
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function encrypt(plainText: string): string {
	if (!process.env.ENCRYPTION_KEY) {
		console.warn('⚠️  ENCRYPTION_KEY not set. Using insecure default for seeding.');
	}
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
	const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
	const authTag = cipher.getAuthTag();
	return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

// --- Data Generators ---

async function cleanDatabase() {
	console.log('🧹 Cleaning database...');
	// Order matters due to foreign key constraints
	// We delete children first, then parents

	// 1. Operational Data
	await prisma.auditLog.deleteMany();
	await prisma.changelog.deleteMany();
	await prisma.userNotificationStatus.deleteMany();
	await prisma.notification.deleteMany();

	// 2. Project Content
	await prisma.note.deleteMany();
	await prisma.secret.deleteMany();
	await prisma.environment.deleteMany();
	await prisma.endpoint.deleteMany();
	await prisma.schemaComponent.deleteMany();
	await prisma.projectLink.deleteMany();

	// 3. Access Control
	await prisma.userProjectAccess.deleteMany();
	await prisma.teamProjectAccess.deleteMany();
	await prisma.teamMembership.deleteMany();

	// 4. Core Entities
	await prisma.project.deleteMany();
	await prisma.team.deleteMany();
	await prisma.authProvider.deleteMany();
	await prisma.user.deleteMany();

	console.log('✨ Database clean.');
}

async function seedUsersAndTeams() {
	console.log('👥 Seeding Identity (Users & Teams)...');

	// --- 1. Create Teams (Varied by department and function) ---
	// We use real-world IDs to make them easy to reference in tests
	const teams = [
		{ id: 'leadership', name: 'Executive Leadership' },
		{ id: 'backend', name: 'Backend Engineering' },
		{ id: 'frontend', name: 'Frontend Engineering' },
		{ id: 'mobile', name: 'Mobile (iOS/Android)' },
		{ id: 'devops', name: 'Platform & DevOps' },
		{ id: 'security', name: 'InfoSec & Compliance' },
		{ id: 'product', name: 'Product Management' },
		{ id: 'qa', name: 'Quality Assurance' },
		{ id: 'legacy', name: 'Legacy Maintenance' }, // An empty team example
	];

	for (const t of teams) {
		await prisma.team.create({ data: t });
	}

	// --- 2. Create Users (Varied roles and states) ---
	const commonPassword = await hash('password123', SALT_ROUNDS);

	const users = [
		// 👑 The Super Admin
		// Has access to everything via Role.admin
		{
			username: 'amir.zouerami',
			role: Role.admin,
			teams: ['backend', 'product', 'security', 'leadership'],
			image: 'amir.zouerami.png',
		},

		// 👩‍💻 The Standard Member (Frontend Lead)
		// Access depends on Team or Project assignments
		{
			username: 'brooklyn.lee',
			role: Role.member,
			teams: ['frontend', 'mobile'], // Cross-functional
			image: 'brooklyn.lee.png',
		},

		// 🛠️ The DevOps Engineer
		// Often creates Environments and Secrets
		{
			username: 'frank.miller',
			role: Role.member,
			teams: ['devops', 'backend'],
			image: 'frank.miller.png',
		},

		// 🕵️‍♀️ The QA Specialist
		// Usually has VIEWER access to verify implementations
		{
			username: 'grace.kim',
			role: Role.member,
			teams: ['qa'],
			image: 'grace.kim.png',
		},

		// 🚫 The "Bad Actor" / Restricted User
		// Used to test Deny Lists and ABAC rules
		{
			username: 'malicious.mike',
			role: Role.member,
			teams: ['backend'], // Even though he's in backend, we might deny him specific access later
			image: null,
		},

		// 👶 The Junior Developer
		// No team memberships initially, strict permissions
		{
			username: 'junior.dev',
			role: Role.guest,
			teams: [],
			image: null,
		},

		// 🌐 The OAuth User
		// Simulates a user who signed up via GitLab and has NO local password
		{
			username: 'gitlab.user',
			role: Role.member,
			teams: ['frontend'],
			image: null,
			oauthId: '123456',
		},

		// 👻 The "Ghost" User
		// A user who might be deleted or inactive in future tests
		{
			username: 'ghost.user',
			role: Role.guest,
			teams: ['legacy'],
			image: null,
		},
	];

	for (const u of users) {
		const user = await prisma.user.create({
			data: {
				username: u.username,
				// OAuth user has no password
				password: u.oauthId ? null : commonPassword,
				role: u.role,
				profileImage: u.image ? `/uploads/avatars/${u.image}` : null,
				teamMemberships: {
					create: u.teams.map((tid) => ({
						team: { connect: { id: tid } },
					})),
				},
			},
		});

		if (u.oauthId) {
			await prisma.authProvider.create({
				data: {
					provider: 'gitlab',
					providerId: u.oauthId,
					userId: user.id,
				},
			});
			console.log(`   - Created OAuth link for ${u.username}`);
		}
	}
	console.log(`   - Seeded ${users.length} users and ${teams.length} teams.`);
}

// Path: prisma/seed.ts (Part 2/3)
//--------------------------------------------------------------------

async function seedProjects() {
	console.log('🚀 Seeding Projects...');

	// --- 0. Fetch Actors for attribution ---
	// We need these IDs to link creators, updaters, and authors properly.
	const amir = await prisma.user.findUniqueOrThrow({ where: { username: 'amir.zouerami' } });
	const brooklyn = await prisma.user.findUniqueOrThrow({ where: { username: 'brooklyn.lee' } });
	const frank = await prisma.user.findUniqueOrThrow({ where: { username: 'frank.miller' } });
	const grace = await prisma.user.findUniqueOrThrow({ where: { username: 'grace.kim' } });

	// =================================================================
	// 1. The "Golden Standard": E-Commerce V3
	// =================================================================
	console.log('   - Creating "E-Commerce V3" (Project Nova)...');

	const projNova = await prisma.project.create({
		data: {
			name: 'E-Commerce V3',
			nameNormalized: 'e-commerce v3',
			description:
				'The public-facing storefront API. Source of truth for mobile apps and the web frontend.',
			creatorId: amir.id,
			updatedById: amir.id,
			servers: [
				{ url: 'https://api.shop.nova.test/v3', description: 'Production' },
				{ url: 'https://staging.api.shop.nova.test/v3', description: 'Staging' },
				{ url: 'http://localhost:8080/v3', description: 'Local Dev' },
			],
			links: {
				create: [
					{ name: 'Figma Designs', url: 'https://figma.com/file/nova-ui-kit' },
					{ name: 'Jira Board', url: 'https://jira.company.com/projects/NOVA' },
					{
						name: 'Datadog Dashboard',
						url: 'https://app.datadoghq.com/dashboard/nova-metrics',
					},
				],
			},
			// Access Control:
			// - Amir is Owner (Individual)
			// - Backend Team is Owner
			// - Product & Frontend are Viewers
			userAccesses: { create: [{ userId: amir.id, type: AccessType.OWNER }] },
			teamAccesses: {
				create: [
					{ teamId: 'backend', type: AccessType.OWNER },
					{ teamId: 'frontend', type: AccessType.VIEWER },
					{ teamId: 'product', type: AccessType.VIEWER },
					{ teamId: 'qa', type: AccessType.VIEWER },
				],
			},
		},
	});

	// --- 1a. Rich Schema Components (Nested) ---
	// We create them in order so we can reference them if needed,
	// though strictly speaking Swagger $ref is string-based.

	console.log('     ...Defining complex schemas (Product, Order, Error)...');

	// 1. Error Response (Generic)
	await prisma.schemaComponent.create({
		data: {
			projectId: projNova.id,
			name: 'Error',
			description: 'Standard RFC 7807 error format.',
			creatorId: amir.id,
			updatedById: amir.id,
			schema: {
				type: 'object',
				properties: {
					type: {
						type: 'string',
						format: 'uri',
						example: 'https://nova.api/errors/not-found',
					},
					title: { type: 'string', example: 'Resource Not Found' },
					status: { type: 'integer', example: 404 },
					detail: { type: 'string', 'x-faker': 'lorem.sentence' },
					instance: { type: 'string', format: 'uri' },
				},
				required: ['type', 'title', 'status'],
			},
		},
	});

	// 2. Category
	const schemaCategory = await prisma.schemaComponent.create({
		data: {
			projectId: projNova.id,
			name: 'Category',
			description: 'Product taxonomy node.',
			creatorId: brooklyn.id,
			updatedById: brooklyn.id,
			schema: {
				type: 'object',
				properties: {
					id: { type: 'integer', 'x-faker': 'number.int' },
					name: { type: 'string', 'x-faker': 'commerce.department' },
					slug: { type: 'string', 'x-faker': 'lorem.slug' },
				},
				required: ['id', 'name'],
			},
		},
	});

	// 3. Product (References Category)
	const schemaProduct = await prisma.schemaComponent.create({
		data: {
			projectId: projNova.id,
			name: 'Product',
			description: 'Represents a sellable SKU.',
			creatorId: amir.id,
			updatedById: amir.id,
			schema: {
				type: 'object',
				properties: {
					id: { type: 'string', format: 'uuid', 'x-faker': 'string.uuid' },
					sku: { type: 'string', example: 'TSHIRT-BLK-L' },
					name: { type: 'string', 'x-faker': 'commerce.productName' },
					price: {
						type: 'number',
						format: 'float',
						minimum: 0,
						'x-faker': 'commerce.price',
					},
					description: { type: 'string', 'x-faker': 'commerce.productDescription' },
					// Reference to another component
					category: { $ref: `#/components/schemas/${schemaCategory.name}` },
					stockLevel: {
						type: 'integer',
						'x-faker': { 'number.int': { min: 0, max: 100 } },
					},
				},
				required: ['id', 'sku', 'name', 'price'],
			},
		},
	});

	// 4. Order (Complex Nested Object)
	await prisma.schemaComponent.create({
		data: {
			projectId: projNova.id,
			name: 'Order',
			description: 'A customer transaction.',
			creatorId: amir.id,
			updatedById: amir.id,
			schema: {
				type: 'object',
				properties: {
					orderId: { type: 'string', format: 'uuid', 'x-faker': 'string.uuid' },
					status: {
						type: 'string',
						enum: ['pending', 'paid', 'shipped', 'cancelled'],
						default: 'pending',
					},
					items: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								product: { $ref: `#/components/schemas/${schemaProduct.name}` },
								quantity: { type: 'integer', minimum: 1, default: 1 },
							},
						},
					},
					total: { type: 'number', 'x-faker': 'commerce.price' },
					createdAt: { type: 'string', format: 'date-time', 'x-faker': 'date.past' },
				},
				required: ['orderId', 'items', 'total'],
			},
		},
	});

	// --- 1b. Endpoints (Rich Metadata) ---
	console.log('     ...Defining Endpoints with notes and lifecycle states...');

	// Endpoint 1: Get Products (Published, Rich query params)
	const epGetProducts = await prisma.endpoint.create({
		data: {
			projectId: projNova.id,
			path: '/products',
			method: 'get',
			status: EndpointStatus.PUBLISHED,
			creatorId: amir.id,
			updatedById: amir.id,
			operation: {
				tags: ['Catalog'],
				summary: 'List All Products',
				description:
					'Returns a paginated list of products with optional filtering by category or price range.',
				operationId: 'listProducts',
				parameters: [
					{ name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
					{
						name: 'limit',
						in: 'query',
						schema: { type: 'integer', default: 20, maximum: 100 },
					},
					{
						name: 'sort',
						in: 'query',
						schema: { type: 'string', enum: ['price_asc', 'price_desc', 'newest'] },
					},
				],
				responses: {
					'200': {
						description: 'A list of products.',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										data: {
											type: 'array',
											items: {
												$ref: `#/components/schemas/${schemaProduct.name}`,
											},
										},
										meta: {
											type: 'object',
											properties: { total: { type: 'integer' } },
										},
									},
								},
							},
						},
					},
					'400': {
						description: 'Invalid query parameters.',
						content: {
							'application/json': { schema: { $ref: '#/components/schemas/Error' } },
						},
					},
				},
			},
		},
	});

	// Note 1: Collaboration simulation
	await prisma.note.create({
		data: {
			endpointId: epGetProducts.id,
			authorId: brooklyn.id,
			content:
				'Hey @amir.zouerami, verify if the "sort" parameter supports geolocation sorting for Q4 roadmap?',
		},
	});

	// Endpoint 2: Create Order (In Review)
	const epCreateOrder = await prisma.endpoint.create({
		data: {
			projectId: projNova.id,
			path: '/orders',
			method: 'post',
			status: EndpointStatus.IN_REVIEW, // Testing the "Review" badge in UI
			creatorId: brooklyn.id, // Frontend lead proposing a new endpoint
			updatedById: brooklyn.id,
			operation: {
				tags: ['Orders'],
				summary: 'Submit a New Order',
				description: 'Creates a new pending order. Requires authentication.',
				security: [{ BearerAuth: [] }],
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									items: {
										type: 'array',
										items: {
											type: 'object',
											properties: {
												sku: { type: 'string' },
												quantity: { type: 'integer' },
											},
										},
									},
									shippingAddressId: { type: 'string', format: 'uuid' },
								},
							},
						},
					},
				},
				responses: {
					'201': {
						description: 'Order created successfully',
						content: {
							'application/json': { schema: { $ref: '#/components/schemas/Order' } },
						},
					},
					'422': {
						description: 'Validation Error',
						content: {
							'application/json': { schema: { $ref: '#/components/schemas/Error' } },
						},
					},
				},
			},
		},
	});

	// Note 2: QA Feedback
	await prisma.note.create({
		data: {
			endpointId: epCreateOrder.id,
			authorId: grace.id, // QA User
			content:
				'I will write the automation tests for this once it moves to PUBLISHED. @brooklyn.lee please confirm if shippingAddressId is optional for digital goods.',
		},
	});

	// --- 1c. Environments & Encrypted Secrets ---
	console.log('     ...Vaulting encrypted secrets...');

	const envProd = await prisma.environment.create({
		data: { name: 'Production', description: 'AWS US-East-1 Cluster', projectId: projNova.id },
	});

	const envStaging = await prisma.environment.create({
		data: {
			name: 'Staging',
			description: 'Mirrors production data (sanitized)',
			projectId: projNova.id,
		},
	});

	// We encrypt these values so the API can actually decrypt them for the "Reveal" feature
	await prisma.secret.createMany({
		data: [
			{
				environmentId: envProd.id,
				key: 'STRIPE_SECRET_KEY',
				value: encrypt('sk_live_51Hg...REDACTED_REAL_KEY'),
				description: 'Live payment processing key.',
			},
			{
				environmentId: envProd.id,
				key: 'DATABASE_URL',
				value: encrypt(
					'postgres://admin:complex_password@db-prod.nova.internal:5432/nova_v3',
				),
			},
			{
				environmentId: envStaging.id,
				key: 'STRIPE_SECRET_KEY',
				value: encrypt('sk_test_4eC3...TEST_KEY'),
				description: 'Test mode key.',
			},
			{
				environmentId: envStaging.id,
				key: 'FEATURE_FLAG_NEW_CHECKOUT',
				value: encrypt('true'),
			},
		],
	});

	// Path: prisma/seed.ts (Part 3/3)
	//--------------------------------------------------------------------

	// =================================================================
	// 2. The "Legacy Monolith" (Ugly Data Test)
	// Purpose: Test UI resilience against missing metadata, weird paths, and mixed conventions.
	// =================================================================
	console.log('   - Creating "Legacy Monolith" (The Ugly)...');

	await prisma.project.create({
		data: {
			name: 'Legacy Monolith',
			nameNormalized: 'legacy monolith',
			description:
				'The old PHP backend. DO NOT ADD NEW ENDPOINTS HERE. Maintained by DevOps.',
			creatorId: frank.id,
			updatedById: frank.id,
			// Access: Only "Legacy Maintenance" team has write access.
			teamAccesses: {
				create: [{ teamId: 'legacy', type: AccessType.OWNER }],
			},
			endpoints: {
				create: [
					{
						path: '/v1/getUserStuff.php', // 🤢 Ugly path extension
						method: 'post', // 🤢 POST used for retrieval
						status: EndpointStatus.DEPRECATED, // ⚠️ Deprecated badge test
						creatorId: frank.id,
						updatedById: frank.id,
						operation: {
							// ❌ No summary, No tags - UI must handle empty states gracefully
							description:
								'Returns an XML blob of user data. Good luck parsing this.',
							responses: {
								'200': { description: 'XML Data (text/xml)' },
								'500': { description: 'Server Error' },
							},
						},
					},
					{
						path: '/admin/force_delete',
						method: 'delete',
						status: EndpointStatus.PUBLISHED,
						creatorId: frank.id,
						updatedById: frank.id,
						operation: {
							tags: ['Danger Zone'],
							summary: 'Hard Delete Resource',
							// 🔒 Security requirement in description
							description: 'Requires VPN access. Deletes physically from disk.',
							responses: { '204': { description: 'Gone forever' } },
						},
					},
				],
			},
		},
	});

	// =================================================================
	// 3. The "Spec-First" Project (Drafts & Reviews)
	// Purpose: Test lifecycle states (DRAFT -> IN_REVIEW) and Schema references.
	// =================================================================
	console.log('   - Creating "NextGen AI Platform"...');

	const projAi = await prisma.project.create({
		data: {
			name: 'NextGen AI Platform',
			nameNormalized: 'nextgen ai platform',
			description: 'Experimental AI services for image generation and text analysis.',
			creatorId: brooklyn.id,
			updatedById: brooklyn.id,
			userAccesses: { create: [{ userId: brooklyn.id, type: AccessType.OWNER }] },
		},
	});

	await prisma.endpoint.create({
		data: {
			projectId: projAi.id,
			path: '/inference/text',
			method: 'post',
			status: EndpointStatus.DRAFT, // 📝 Draft state test
			creatorId: brooklyn.id,
			updatedById: brooklyn.id,
			operation: {
				tags: ['AI', 'Text'],
				summary: 'Run Text Inference',
				requestBody: {
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									prompt: { type: 'string', example: 'Explain Quantum Physics' },
									temperature: { type: 'number', default: 0.7 },
								},
								required: ['prompt'],
							},
						},
					},
				},
				responses: {
					'200': {
						description: 'Prediction result',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: { text: { type: 'string' } },
								},
							},
						},
					},
				},
			},
		},
	});

	// =================================================================
	// 4. The "Fortress" (Security & ABAC Test)
	// Purpose: Verify that Denied Users cannot see projects even if they are in the allowed team.
	// =================================================================
	console.log('   - Creating "Internal Audits" (Restricted)...');

	await prisma.project.create({
		data: {
			name: 'Internal Audits',
			nameNormalized: 'internal audits',
			description:
				'Highly sensitive financial logs and compliance reports. RESTRICTED ACCESS.',
			creatorId: amir.id,
			updatedById: amir.id,
			// 🚫 Explicit Deny List
			// "Malicious Mike" is in the 'backend' team (if added later),
			// but this specific deny rule should override any team inheritance.
			deniedUsers: { connect: { username: 'malicious.mike' } },

			// Only Security Team has ownership
			teamAccesses: {
				create: [{ teamId: 'security', type: AccessType.OWNER }],
			},
			// Admin (Amir) gets access by default role, but we add him explicitly as owner for clarity
			userAccesses: { create: [{ userId: amir.id, type: AccessType.OWNER }] },
		},
	});

	// =================================================================
	// 5. The "Pagination Beast" (Volume Test)
	// Purpose: Generate 120+ endpoints to force the Frontend to use Virtual Scrolling / Pagination.
	// =================================================================
	console.log('   - Creating "Volume Test API" (Performance)...');

	const projVolume = await prisma.project.create({
		data: {
			name: 'Volume Test API',
			nameNormalized: 'volume test api',
			description:
				'A generated project to test pagination, search performance, and virtual lists.',
			creatorId: amir.id,
			updatedById: amir.id,
			userAccesses: { create: [{ userId: amir.id, type: AccessType.OWNER }] },
		},
	});

	const volumeEndpoints: any[] = [];

	for (let i = 1; i <= 150; i++) {
		// Mix up methods and statuses to make the list look "real" but chaotic
		const method = i % 3 === 0 ? 'post' : i % 3 === 1 ? 'put' : 'get';
		const status =
			i % 15 === 0
				? EndpointStatus.DEPRECATED
				: i % 5 === 0
					? EndpointStatus.DRAFT
					: EndpointStatus.PUBLISHED;

		volumeEndpoints.push({
			path: `/resources/items/${i}`,
			method: method,
			status: status,
			projectId: projVolume.id,
			creatorId: amir.id,
			updatedById: amir.id,
			operation: {
				tags: [`Group ${Math.floor(i / 20) + 1}`], // Creates about 8 distinct tags
				summary: `Generated Endpoint #${i}`,
				description: `This is a generated endpoint description for item ${i}. It exists to take up space in the UI.`,
				responses: { '200': { description: 'OK' } },
			},
		});
	}

	// Batch insert for performance
	await prisma.endpoint.createMany({ data: volumeEndpoints });
	console.log(`     ...Generated ${volumeEndpoints.length} endpoints.`);
}

/**
 * Orchestrates the full database seeding process.
 */
async function main() {
	try {
		console.log('🌱 Starting Seed Process...');
		const start = Date.now();

		await cleanDatabase();
		await seedUsersAndTeams();
		await seedProjects();

		const duration = ((Date.now() - start) / 1000).toFixed(2);
		console.log(`✅ Seeding finished successfully in ${duration}s.`);
		console.log(`   Admin Login: amir.zouerami / password123`);
		console.log(`   User Login:  brooklyn.lee / password123`);
	} catch (e) {
		console.error('❌ Seeding failed:', e);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

main();
