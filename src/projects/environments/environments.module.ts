import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GuardsModule } from '../guards/guards.module';
import { EnvironmentsController } from './environments.controller';
import { EnvironmentsService } from './environments.service';

@Module({
	imports: [PrismaModule, GuardsModule],
	controllers: [EnvironmentsController],
	providers: [EnvironmentsService],
})
export class EnvironmentsModule {}
