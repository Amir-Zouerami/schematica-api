import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuditListener } from './audit.listener';

@Module({
	imports: [PrismaModule],
	providers: [AuditListener],
})
export class AuditModule {}
