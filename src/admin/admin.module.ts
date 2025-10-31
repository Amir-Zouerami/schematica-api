import { Module } from '@nestjs/common';
import { AdminTeamsModule } from './teams/admin-teams.module';
import { AdminUsersModule } from './users/admin-users.module';

@Module({
	imports: [AdminTeamsModule, AdminUsersModule],
})
export class AdminModule {}
