import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProjectOwnerGuard } from './project-owner.guard';
import { ProjectViewerGuard } from './project-viewer.guard';

@Module({
	imports: [PrismaModule],
	providers: [ProjectOwnerGuard, ProjectViewerGuard],
	exports: [ProjectOwnerGuard, ProjectViewerGuard],
})
export class GuardsModule {}
