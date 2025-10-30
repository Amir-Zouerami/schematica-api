import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProjectViewerGuard } from '../guards/project-viewer.guard';
import { NotePermissionGuard } from './guards/note-permission.guard';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';

describe('NotesController', () => {
	let controller: NotesController;

	const mockNotesService = {};
	const mockPrismaService = {};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [NotesController],
			providers: [
				{ provide: NotesService, useValue: mockNotesService },
				NotePermissionGuard,
				ProjectViewerGuard,
				{ provide: PrismaService, useValue: mockPrismaService },
			],
		}).compile();

		controller = module.get<NotesController>(NotesController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});
});
