import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProjectOwnerGuard } from './guards/project-owner.guard';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
	imports: [PrismaModule, AuthModule],
	controllers: [ProjectsController],
	providers: [ProjectsService, ProjectOwnerGuard],
})
export class ProjectsModule {}
