import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ServerResponse } from 'http';
import { LoggerModule } from 'nestjs-pino';
import { AccessControlModule } from './access-control/access-control.module';
import { AdminModule } from './admin/admin.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { ChangelogModule } from './changelog/changelog.module';
import { CleanupModule } from './cleanup/cleanup.module';
import { FilesService } from './common/files/files.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { InjectUserInterceptor } from './common/interceptors/inject-user.interceptor';
import { TransformInterceptor } from './common/interceptors/transform/transform.interceptor';
import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import { AllConfigTypes } from './config/config.type';
import databaseConfig from './config/database.config';
import fileConfig from './config/file.config';
import { NotificationModule } from './notifications/notification.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfileModule } from './profile/profile.module';
import { ProjectsModule } from './projects/projects.module';
import { TeamsModule } from './teams/teams.module';
import { UsersModule } from './users/users.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [databaseConfig, appConfig, authConfig, fileConfig],
		}),

		EventEmitterModule.forRoot(),

		ScheduleModule.forRoot(),

		LoggerModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService<AllConfigTypes, true>) => {
				const isProduction =
					configService.get('app.nodeEnv', { infer: true }) === 'production';

				return {
					pinoHttp: {
						transport: !isProduction
							? {
									target: 'pino-pretty',
									options: {
										singleLine: false,
										colorize: true,
									},
								}
							: undefined,
						level: isProduction ? 'info' : 'debug',
						customProps: (_req, res: ServerResponse) => {
							return res.customProps || {};
						},
					},
				};
			},
		}),

		AccessControlModule,
		PrismaModule,
		AuthModule,
		UsersModule,
		TeamsModule,
		ProjectsModule,
		AdminModule,
		ProfileModule,
		AuditModule,
		ChangelogModule,
		CleanupModule,
		NotificationModule,
	],
	controllers: [],
	providers: [
		{
			provide: APP_INTERCEPTOR,
			useClass: InjectUserInterceptor,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: TransformInterceptor,
		},
		{
			provide: APP_FILTER,
			useClass: AllExceptionsFilter,
		},
		FilesService,
	],
})
export class AppModule {}
