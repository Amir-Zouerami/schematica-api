import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, type TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotesService } from './notes.service';

describe('NotesService', () => {
	let service: NotesService;

	const mockPrismaService = {};
	const mockPinoLogger = {
		setContext: jest.fn(),
		error: jest.fn(),
	};
	const mockEventEmitter = {
		emit: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				NotesService,
				{ provide: PrismaService, useValue: mockPrismaService },
				{ provide: PinoLogger, useValue: mockPinoLogger },
				{ provide: EventEmitter2, useValue: mockEventEmitter },
			],
		}).compile();

		service = module.get<NotesService>(NotesService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
