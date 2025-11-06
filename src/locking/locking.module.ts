import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GuardsModule } from 'src/projects/guards/guards.module';
import { EndpointProjectMatchGuard } from './guards/endpoint-project-match.guard';
import { LockOwnerGuard } from './guards/lock-owner.guard';
import { LockingController } from './locking.controller';
import { LockingGateway } from './locking.gateway';
import { LockingService } from './locking.service';

@Module({
	imports: [PrismaModule, JwtModule.register({}), GuardsModule],
	controllers: [LockingController],
	providers: [LockingService, LockingGateway, LockOwnerGuard, EndpointProjectMatchGuard],
	exports: [LockingService, LockOwnerGuard],
})
export class LockingModule {}
