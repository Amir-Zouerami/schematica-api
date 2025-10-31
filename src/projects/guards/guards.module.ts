import { Module } from '@nestjs/common';
import { AccessControlModule } from 'src/access-control/access-control.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProjectOwnerGuard } from './project-owner.guard';
import { ProjectViewerGuard } from './project-viewer.guard';

@Module({
	imports: [PrismaModule, AccessControlModule],
	providers: [ProjectOwnerGuard, ProjectViewerGuard],
	exports: [ProjectOwnerGuard, ProjectViewerGuard],
})
export class GuardsModule {}
