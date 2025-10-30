import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EndpointsModule } from './endpoints/endpoints.module';
import { ProjectOwnerGuard } from './guards/project-owner.guard';
import { NotesModule } from './notes/notes.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { OpenApiSpecBuilder } from './spec-builder/openapi-spec.builder';
import { SpecReconciliationService } from './spec-reconciliation/spec-reconciliation.service';
import { AreLinksUniqueConstraint } from './validators/are-links-unique.validator';
@Module({
	imports: [PrismaModule, AuthModule, EndpointsModule, ProjectsModule, NotesModule],
	controllers: [ProjectsController],
	providers: [
		ProjectsService,
		ProjectOwnerGuard,
		OpenApiSpecBuilder,
		AreLinksUniqueConstraint,
		SpecReconciliationService,
	],
})
export class ProjectsModule {}
