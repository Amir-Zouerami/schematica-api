import { Test, type TestingModule } from '@nestjs/testing';
import { AccessControlService } from 'src/access-control/access-control.service';
import { ProjectOwnerGuard } from '../guards/project-owner.guard';
import { ProjectViewerGuard } from '../guards/project-viewer.guard';
import { EndpointsController } from './endpoints.controller';
import { EndpointsService } from './endpoints.service';

describe('EndpointsController', () => {
	let controller: EndpointsController;

	const mockEndpointsService = {};
	const mockAccessControlService = {
		canViewProject: jest.fn(),
		canOwnProject: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [EndpointsController],
			providers: [
				{ provide: EndpointsService, useValue: mockEndpointsService },
				{ provide: AccessControlService, useValue: mockAccessControlService },
				ProjectOwnerGuard,
				ProjectViewerGuard,
			],
		}).compile();

		controller = module.get<EndpointsController>(EndpointsController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});
});
