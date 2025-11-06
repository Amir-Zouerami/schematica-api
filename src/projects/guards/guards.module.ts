import { Module } from '@nestjs/common';
import { AccessControlModule } from 'src/access-control/access-control.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProjectCreationGuard } from './project-creation.guard';
import { ProjectOwnerGuard } from './project-owner.guard';
import { ProjectViewerGuard } from './project-viewer.guard';

@Module({
	imports: [PrismaModule, AccessControlModule],
	providers: [ProjectOwnerGuard, ProjectViewerGuard, ProjectCreationGuard],
	exports: [ProjectOwnerGuard, ProjectViewerGuard, ProjectCreationGuard, AccessControlModule],
})
export class GuardsModule {}
