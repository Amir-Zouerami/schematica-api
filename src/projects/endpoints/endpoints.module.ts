import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NotesController } from '../notes/notes.controller';
import { NotesModule } from '../notes/notes.module';
import { NotesService } from '../notes/notes.service';
import { EndpointsController } from './endpoints.controller';
import { EndpointsService } from './endpoints.service';

@Module({
	imports: [PrismaModule, NotesModule],
	controllers: [EndpointsController, NotesController],
	providers: [EndpointsService, NotesService],
})
export class EndpointsModule {}
