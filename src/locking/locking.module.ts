import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GuardsModule } from 'src/projects/guards/guards.module';
import { LockOwnerGuard } from './guards/lock-owner.guard';
import { LockingController } from './locking.controller';
import { LockingGateway } from './locking.gateway';
import { LockingService } from './locking.service';

@Module({
	imports: [PrismaModule, JwtModule.register({}), GuardsModule],
	controllers: [LockingController],
	providers: [LockingService, LockingGateway, LockOwnerGuard],
	exports: [LockingService, LockOwnerGuard],
})
export class LockingModule {}
