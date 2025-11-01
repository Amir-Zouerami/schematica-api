import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { FilesService } from 'src/common/files/files.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminUsersService } from './admin-users.service';

describe('AdminUsersService', () => {
	let service: AdminUsersService;

	const mockPrismaService = {};
	const mockPinoLogger = { setContext: jest.fn(), error: jest.fn() };
	const mockConfigService = { get: jest.fn() };
	const mockFilesService = {};
	const mockEventEmitter = { emit: jest.fn() };

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AdminUsersService,
				{ provide: PrismaService, useValue: mockPrismaService },
				{ provide: PinoLogger, useValue: mockPinoLogger },
				{ provide: ConfigService, useValue: mockConfigService },
				{ provide: FilesService, useValue: mockFilesService },
				{ provide: EventEmitter2, useValue: mockEventEmitter },
			],
		}).compile();

		service = module.get<AdminUsersService>(AdminUsersService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
