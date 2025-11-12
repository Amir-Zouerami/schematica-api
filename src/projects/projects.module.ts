import { Module } from '@nestjs/common';
import { AccessControlModule } from 'src/access-control/access-control.module';
import { ApiLintingModule } from 'src/api-linting/api-linting.module';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EndpointsModule } from './endpoints/endpoints.module';
import { EnvironmentsModule } from './environments/environments.module';
import { GuardsModule } from './guards/guards.module';
import { NotesModule } from './notes/notes.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { SchemaComponentsModule } from './schema-components/schema-components.module';
import { SecretsModule } from './secrets/secrets.module';
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
		EnvironmentsModule,
		SecretsModule,
		SchemaComponentsModule,
		ApiLintingModule,
	],
	controllers: [ProjectsController],
	providers: [
		ProjectsService,
		OpenApiSpecBuilder,
		AreLinksUniqueConstraint,
		SpecReconciliationService,
	],
	exports: [ProjectsService],
})
export class ProjectsModule {}
