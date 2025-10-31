import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AccessControlService } from './access-control.service';

@Module({
	imports: [PrismaModule],
	providers: [AccessControlService],
	exports: [AccessControlService],
})
export class AccessControlModule {}
