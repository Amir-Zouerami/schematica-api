import { ValidationPipe, VersioningType } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
	let app: NestFastifyApplication;

	beforeAll(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

		app.setGlobalPrefix('api');
		app.enableVersioning({
			type: VersioningType.URI,
			defaultVersion: '2',
		});
		app.useGlobalPipes(new ValidationPipe());

		await app.init();

		const fastifyInstance = app.getHttpAdapter().getInstance();
		await fastifyInstance.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	it('GET / -> should return 404', () => {
		return request(app.getHttpServer()).get('/').expect(404);
	});

	it('POST /api/v2/auth/login -> should return 401 for an empty request', () => {
		return request(app.getHttpServer()).post('/api/v2/auth/login').send({}).expect(401);
	});
});
