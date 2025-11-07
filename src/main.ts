// biome-ignore-all lint/suspicious/useAwait: Passport's type signature requires a Promise

import { fastifyCookie } from '@fastify/cookie';
import multipart from '@fastify/multipart';
import fastifyPassport from '@fastify/passport';
import type { SecureSessionPluginOptions } from '@fastify/secure-session';
import fastifySecureSession from '@fastify/secure-session';
import fastifyStatic from '@fastify/static';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { GitLabStrategyFastify } from './auth/strategies/gitlab.strategy';
import { LocalStrategyFastify } from './auth/strategies/local.strategy';
import { SocketIoAdapter } from './common/adapters/socket-io.adapter';
import type { AllConfigTypes } from './config/config.type';
import { PrismaService } from './prisma/prisma.service';
import { setupSwagger } from './swagger';
import { UserWithTeams } from './users/users.types';

/**
 * Adds global validation pipes for DTO transformation and sanitation.
 */
function setupPipes(app: INestApplication): void {
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			forbidUnknownValues: true,
			transform: true,
			transformOptions: {
				enableImplicitConversion: true,
			},
		}),
	);
}

/**
 * Configure CORS, static assets, versioning, and Swagger.
 */
async function configureApp(
	app: NestFastifyApplication,
	configService: ConfigService<AllConfigTypes, true>,
): Promise<void> {
	const globalPrefix = configService.get('app.globalPrefix', { infer: true });
	const corsOrigin = configService.get('app.corsOrigin', { infer: true });
	const appVersion = configService.get('app.version', { infer: true });
	const nodeEnv = configService.get('app.nodeEnv', { infer: true });
	const version = appVersion.split('.')[0];

	await app.register(fastifyStatic, {
		root: join(process.cwd(), 'public'),
		prefix: '/',
	});

	app.setGlobalPrefix(globalPrefix);
	app.useLogger(app.get(Logger));
	app.enableVersioning({
		type: VersioningType.URI,
		defaultVersion: version,
	});

	if (corsOrigin) {
		app.enableCors({
			origin: corsOrigin === '*' ? true : corsOrigin.split(','),
			credentials: true,
		});
	}

	if (nodeEnv !== 'production') {
		setupSwagger(app);
	}
}

/**
 * Main bootstrap — creates and configures the Fastify-based NestJS app.
 */
async function bootstrap(): Promise<void> {
	const adapter = new FastifyAdapter({
		genReqId: () => randomUUID(),
	});

	const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
		bufferLogs: true,
	});

	const configService = app.get(ConfigService<AllConfigTypes, true>);
	const port = configService.get('app.port', { infer: true });
	const isProduction = configService.get('app.nodeEnv', { infer: true }) === 'production';
	const authConfig = configService.getOrThrow('auth', { infer: true });
	const sessionSecret = Buffer.from(authConfig.sessionSecret, 'utf8');
	const sessionSalt = Buffer.from(authConfig.sessionSalt, 'utf8');

	// Cookies (required for secure sessions)
	await app.register(fastifyCookie);

	// Secure sessions (used by fastify-passport)
	await app.register<SecureSessionPluginOptions>(fastifySecureSession, {
		secret: sessionSecret,
		salt: sessionSalt,
		cookie: {
			path: '/',
			httpOnly: true,
			secure: isProduction,
			maxAge: 7 * 24 * 60 * 60,
		},
	});

	// fastify-passport initialization
	await app.register(fastifyPassport.initialize());
	await app.register(fastifyPassport.secureSession());

	const prismaService = app.get(PrismaService);

	// eslint-disable-next-line @typescript-eslint/require-await
	fastifyPassport.registerUserSerializer(async (user: UserWithTeams) => {
		return user.id;
	});

	fastifyPassport.registerUserDeserializer(async (id: string) => {
		const user = await prismaService.user.findUnique({
			where: { id },
			include: { teamMemberships: { select: { team: true } } },
		});
		if (!user) {
			return null;
		}

		const { password: _, ...safeUser } = user;
		return { ...safeUser, teams: user.teamMemberships.map((m) => m.team) };
	});

	const localStrategy = app.get(LocalStrategyFastify);
	fastifyPassport.use('local', localStrategy);

	const gitlabStrategy = app.get(GitLabStrategyFastify);
	fastifyPassport.use('gitlab', gitlabStrategy);

	// Multipart (file uploads)
	await app.register(multipart, {
		limits: { fileSize: 10 * 1024 * 1024 },
	});

	// Global validation and app config
	setupPipes(app);
	await configureApp(app, configService);

	// WebSocket adapter
	app.useWebSocketAdapter(new SocketIoAdapter(app));

	// Start server
	await app.listen(port, '0.0.0.0');
}

/* eslint-disable-next-line @typescript-eslint/no-floating-promises */
bootstrap();
