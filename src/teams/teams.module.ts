import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
	imports: [PrismaModule],
	controllers: [TeamsController],
	providers: [TeamsService],
})
export class TeamsModule {}
