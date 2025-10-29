import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProjectOwnerGuard } from './guards/project-owner.guard';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { OpenApiSpecBuilder } from './spec-builder/openapi-spec.builder';
import { AreLinksUniqueConstraint } from './validators/are-links-unique.validator';

@Module({
	imports: [PrismaModule, AuthModule],
	controllers: [ProjectsController],
	providers: [ProjectsService, ProjectOwnerGuard, OpenApiSpecBuilder, AreLinksUniqueConstraint],
})
export class ProjectsModule {}
