import { Module } from '@nestjs/common';
import { AccessControlModule } from 'src/access-control/access-control.module';
import { ProjectsModule } from 'src/projects/projects.module';
import { MockServerController } from './mock-server.controller';
import { MockServerService } from './mock-server.service';

@Module({
	imports: [ProjectsModule, AccessControlModule],
	controllers: [MockServerController],
	providers: [MockServerService],
})
export class MockServerModule {}
