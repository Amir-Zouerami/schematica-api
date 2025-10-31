import { Module } from '@nestjs/common';
import { FilesModule } from 'src/common/files/files.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

@Module({
	imports: [PrismaModule, FilesModule],
	controllers: [AdminUsersController],
	providers: [AdminUsersService],
})
export class AdminUsersModule {}
