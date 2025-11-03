import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuditController } from './audit.controller';
import { AuditListener } from './audit.listener';
import { AuditService } from './audit.service';

@Module({
	imports: [PrismaModule],
	controllers: [AuditController],
	providers: [AuditListener, AuditService],
})
export class AuditModule {}
