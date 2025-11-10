import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GuardsModule } from '../guards/guards.module';
import { SchemaComponentsController } from './schema-components.controller';
import { SchemaComponentsService } from './schema-components.service';

@Module({
	imports: [PrismaModule, GuardsModule],
	controllers: [SchemaComponentsController],
	providers: [SchemaComponentsService],
})
export class SchemaComponentsModule {}
