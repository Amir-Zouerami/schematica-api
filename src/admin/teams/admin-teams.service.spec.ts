import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminTeamsService } from './admin-teams.service';

describe('AdminTeamsService', () => {
	let service: AdminTeamsService;

	const mockPrismaService = {};
	const mockPinoLogger = { setContext: jest.fn(), error: jest.fn() };
	const mockEventEmitter = { emit: jest.fn() };

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AdminTeamsService,
				{ provide: PrismaService, useValue: mockPrismaService },
				{ provide: PinoLogger, useValue: mockPinoLogger },
				{ provide: EventEmitter2, useValue: mockEventEmitter },
			],
		}).compile();

		service = module.get<AdminTeamsService>(AdminTeamsService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
