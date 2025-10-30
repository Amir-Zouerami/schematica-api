import { Test, type TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from 'src/prisma/prisma.service';
import { EndpointsService } from './endpoints.service';

describe('EndpointsService', () => {
	let service: EndpointsService;

	const mockPrismaService = {};
	const mockPinoLogger = {
		setContext: jest.fn(),
		error: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				EndpointsService,
				{ provide: PrismaService, useValue: mockPrismaService },
				{ provide: PinoLogger, useValue: mockPinoLogger },
			],
		}).compile();

		service = module.get<EndpointsService>(EndpointsService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
