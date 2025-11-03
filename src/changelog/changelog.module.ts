import { Module } from '@nestjs/common';
import { AccessControlModule } from 'src/access-control/access-control.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GuardsModule } from 'src/projects/guards/guards.module';
import { ChangelogController } from './changelog.controller';
import { ChangelogListener } from './changelog.listener';
import { ChangelogService } from './changelog.service';

@Module({
	imports: [PrismaModule, GuardsModule, AccessControlModule],
	controllers: [ChangelogController],
	providers: [ChangelogListener, ChangelogService],
})
export class ChangelogModule {}
