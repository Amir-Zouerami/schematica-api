import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
	imports: [PrismaModule, AuthModule],
	controllers: [ProjectsController],
	providers: [ProjectsService],
})
export class ProjectsModule {}
