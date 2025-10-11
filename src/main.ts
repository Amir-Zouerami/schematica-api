import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
	FastifyAdapter,
	NestFastifyApplication,
} from '@nestjs/platform-fastify';

import { Logger } from 'nestjs-pino';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from './app.module';
import type { AllConfigTypes } from './config/config.type';
import { setupSwagger } from './swagger';

async function bootstrap() {
	const adapter = new FastifyAdapter();

	adapter.getInstance().addHook('onRequest', (request, reply, done) => {
		const requestId = uuidv4();
		request.id = requestId;
		reply.header('X-Request-Id', requestId);
		done();
	});

	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		adapter,
		{ bufferLogs: true },
	);

	const configService = app.get(ConfigService<AllConfigTypes, true>);

	const globalPrefix = configService.get('app.globalPrefix', { infer: true });
	const corsOrigin = configService.get('app.corsOrigin', { infer: true });
	const appVersion = configService.get('app.version', { infer: true });
	const port = configService.get('app.port', { infer: true });
	const nodeEnv = configService.get('app.nodeEnv', { infer: true });
	const version = appVersion.split('.')[0];

	app.useStaticAssets({
		root: join(__dirname, '..', 'public'),
		prefix: '/', // serve static files from root
		setHeaders: (res, path) => {
			if (path.endsWith('.wasm')) {
				res.setHeader('Content-Type', 'application/wasm');
			}
		},
	});

	app.useGlobalPipes(new ValidationPipe());
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

	await app.listen(port, '0.0.0.0');
}

/* eslint-disable-next-line @typescript-eslint/no-floating-promises */
bootstrap();
