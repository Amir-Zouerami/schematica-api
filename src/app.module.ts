import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module';
import { TransformInterceptor } from './common/interceptors/transform/transform.interceptor';
import appConfig from './config/app.config';
import { AllConfigTypes } from './config/config.type';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import { PrismaModule } from './prisma/prisma.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [databaseConfig, appConfig, jwtConfig],
		}),

		LoggerModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (
				configService: ConfigService<AllConfigTypes, true>,
			) => {
				const isProduction =
					configService.get('app.nodeEnv', { infer: true }) ===
					'production';

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

						customProps: () => ({
							context: 'HTTP',
						}),
						level: isProduction ? 'info' : 'debug',
					},
				};
			},
		}),

		PrismaModule,
		AuthModule,
	],
	controllers: [],
	providers: [
		{
			provide: APP_INTERCEPTOR,
			useClass: TransformInterceptor,
		},
	],
})
export class AppModule {}
