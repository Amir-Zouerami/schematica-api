import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GuardsModule } from '../guards/guards.module';
import { EndpointsController } from './endpoints.controller';
import { EndpointsService } from './endpoints.service';

@Module({
	imports: [PrismaModule, GuardsModule],
	controllers: [EndpointsController],
	providers: [EndpointsService],
})
export class EndpointsModule {}
