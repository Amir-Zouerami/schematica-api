import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NotificationController } from './notification.controller';
import { NotificationListener } from './notification.listener';
import { NotificationService } from './notification.service';
import { NotificationsGateway } from './notifications.gateway';

@Module({
	imports: [PrismaModule, JwtModule.register({})],
	controllers: [NotificationController],
	providers: [NotificationListener, NotificationService, NotificationsGateway],
	exports: [NotificationsGateway],
})
export class NotificationModule {}
