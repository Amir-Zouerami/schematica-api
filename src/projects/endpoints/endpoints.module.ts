import { Module } from '@nestjs/common';
import { AccessControlModule } from 'src/access-control/access-control.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GuardsModule } from '../guards/guards.module';
import { EndpointsController } from './endpoints.controller';
import { EndpointsService } from './endpoints.service';

@Module({
	imports: [PrismaModule, GuardsModule, AccessControlModule],
	controllers: [EndpointsController],
	providers: [EndpointsService],
})
export class EndpointsModule {}
