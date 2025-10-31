import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AdminTeamsController } from './admin-teams.controller';
import { AdminTeamsService } from './admin-teams.service';

@Module({
	imports: [PrismaModule],
	controllers: [AdminTeamsController],
	providers: [AdminTeamsService],
})
export class AdminTeamsModule {}
