// Path: src/projects/projects.module.ts

import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EndpointsModule } from './endpoints/endpoints.module';
import { ProjectOwnerGuard } from './guards/project-owner.guard';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { SpecReconciliationService } from './spec-reconciliation/spec-reconciliation.service';
import { OpenApiSpecBuilder } from './spec-builder/openapi-spec.builder';
import { AreLinksUniqueConstraint } from './validators/are-links-unique.validator';

@Module({
	imports: [PrismaModule, AuthModule, EndpointsModule],
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
