import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

@Module({
	imports: [PrismaModule],
	controllers: [AdminUsersController],
	providers: [AdminUsersService],
})
export class AdminUsersModule {}
