import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

import { Logger } from 'nestjs-pino';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from './app.module';
import type { AllConfigTypes } from './config/config.type';
import { setupSwagger } from './swagger';

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

function configureApp(
	app: NestFastifyApplication,
	configService: ConfigService<AllConfigTypes, true>,
): void {
	const globalPrefix = configService.get('app.globalPrefix', { infer: true });
	const corsOrigin = configService.get('app.corsOrigin', { infer: true });
	const appVersion = configService.get('app.version', { infer: true });
	const nodeEnv = configService.get('app.nodeEnv', { infer: true });
	const version = appVersion.split('.')[0];

	app.useStaticAssets({
		root: join(__dirname, '..', 'public'),
		prefix: '/',
		setHeaders: (res, path) => {
			if (path.endsWith('.wasm')) {
				res.setHeader('Content-Type', 'application/wasm');
			}
		},
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
 * Bootstraps the NestJS Fastify application and starts the HTTP server.
 *
 * Creates a Fastify-backed Nest application that generates request IDs, reads runtime configuration (including the HTTP port), applies global validation and app configuration, and begins listening on 0.0.0.0 using the configured port.
 */
async function bootstrap() {
	const adapter = new FastifyAdapter({
		genReqId: () => uuidv4(),
	});

	const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
		bufferLogs: true,
	});

	const configService = app.get(ConfigService<AllConfigTypes, true>);
	const port = configService.get('app.port', { infer: true });

	setupPipes(app);
	configureApp(app, configService);

	await app.listen(port, '0.0.0.0');
}

/* eslint-disable-next-line @typescript-eslint/no-floating-promises */
bootstrap();
