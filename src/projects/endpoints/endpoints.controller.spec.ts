import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProjectOwnerGuard } from '../guards/project-owner.guard';
import { ProjectViewerGuard } from '../guards/project-viewer.guard';
import { EndpointsController } from './endpoints.controller';
import { EndpointsService } from './endpoints.service';

describe('EndpointsController', () => {
	let controller: EndpointsController;

	const mockEndpointsService = {};
	const mockPrismaService = {};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [EndpointsController],
			providers: [
				{ provide: EndpointsService, useValue: mockEndpointsService },
				ProjectOwnerGuard,
				ProjectViewerGuard,
				{ provide: PrismaService, useValue: mockPrismaService },
			],
		}).compile();

		controller = module.get<EndpointsController>(EndpointsController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});
});
