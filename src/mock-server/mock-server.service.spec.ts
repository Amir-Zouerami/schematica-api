import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { AccessControlService } from 'src/access-control/access-control.service';
import { ProjectsService } from 'src/projects/projects.service';
import { MockServerService } from './mock-server.service';

describe('MockServerService', () => {
	let service: MockServerService;

	const mockPinoLogger = { setContext: jest.fn() };
	const mockProjectsService = {};
	const mockAccessControlService = {};

	beforeEach(async (): Promise<void> => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				MockServerService,
				{ provide: PinoLogger, useValue: mockPinoLogger },
				{ provide: ProjectsService, useValue: mockProjectsService },
				{ provide: AccessControlService, useValue: mockAccessControlService },
			],
		}).compile();

		service = module.get<MockServerService>(MockServerService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
