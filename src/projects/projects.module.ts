import { Module } from '@nestjs/common';
import { AccessControlModule } from 'src/access-control/access-control.module';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EndpointsModule } from './endpoints/endpoints.module';
import { GuardsModule } from './guards/guards.module';
import { NotesModule } from './notes/notes.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { OpenApiSpecBuilder } from './spec-builder/openapi-spec.builder';
import { SpecReconciliationService } from './spec-reconciliation/spec-reconciliation.service';
import { AreLinksUniqueConstraint } from './validators/are-links-unique.validator';

@Module({
	imports: [
		PrismaModule,
		AuthModule,
		EndpointsModule,
		NotesModule,
		GuardsModule,
		AccessControlModule,
	],
	controllers: [ProjectsController],
	providers: [
		ProjectsService,
		OpenApiSpecBuilder,
		AreLinksUniqueConstraint,
		SpecReconciliationService,
	],
})
export class ProjectsModule {}
