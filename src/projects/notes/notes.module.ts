import { Module } from '@nestjs/common';
import { AccessControlModule } from 'src/access-control/access-control.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NotePermissionGuard } from './guards/note-permission.guard';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';

@Module({
	imports: [PrismaModule, AccessControlModule],
	controllers: [NotesController],
	providers: [NotesService, NotePermissionGuard],
})
export class NotesModule {}
