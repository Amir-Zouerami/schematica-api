import { Module } from '@nestjs/common';
import { FilesModule } from 'src/common/files/files.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
	imports: [PrismaModule, FilesModule],
	controllers: [ProfileController],
	providers: [ProfileService],
})
export class ProfileModule {}
