import { Test, type TestingModule } from '@nestjs/testing';
import { AccessControlService } from 'src/access-control/access-control.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotePermissionGuard } from './guards/note-permission.guard';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';

describe('NotesController', () => {
	let controller: NotesController;

	const mockNotesService = {};
	const mockPrismaService = {};
	const mockAccessControlService = {
		canViewProject: jest.fn(),
		canOwnProject: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [NotesController],
			providers: [
				{ provide: NotesService, useValue: mockNotesService },
				{ provide: PrismaService, useValue: mockPrismaService },
				{ provide: AccessControlService, useValue: mockAccessControlService },
				NotePermissionGuard,
			],
		}).compile();

		controller = module.get<NotesController>(NotesController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});
});
