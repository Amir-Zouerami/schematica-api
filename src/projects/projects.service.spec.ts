import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { ApiLintingService } from 'src/api-linting/api-linting.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProjectsService } from './projects.service';
import { OpenApiSpecBuilder } from './spec-builder/openapi-spec.builder';
import { SpecReconciliationService } from './spec-reconciliation/spec-reconciliation.service';

describe('ProjectsService', () => {
	let service: ProjectsService;

	const mockPrismaService = {};
	const mockPinoLogger = { setContext: jest.fn(), error: jest.fn() };
	const mockSpecBuilder = {};
	const mockSpecReconciliationService = {};
	const mockEventEmitter = { emit: jest.fn() };
	const mockApiLintingService = {};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ProjectsService,
				{ provide: PrismaService, useValue: mockPrismaService },
				{ provide: PinoLogger, useValue: mockPinoLogger },
				{ provide: OpenApiSpecBuilder, useValue: mockSpecBuilder },
				{
					provide: SpecReconciliationService,
					useValue: mockSpecReconciliationService,
				},
				{ provide: EventEmitter2, useValue: mockEventEmitter },
				{ provide: ApiLintingService, useValue: mockApiLintingService },
			],
		}).compile();

		service = module.get<ProjectsService>(ProjectsService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
