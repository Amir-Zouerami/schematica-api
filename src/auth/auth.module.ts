import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import type { AllConfigTypes } from 'src/config/config.type';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { GitLabStrategyFastify } from './strategies/gitlab.strategy';
import { JwtStrategyFastify } from './strategies/jwt.strategy';
import { LocalStrategyFastify } from './strategies/local.strategy';

@Module({
	imports: [
		PrismaModule,
		PassportModule,
		ConfigModule,
		JwtModule.registerAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService<AllConfigTypes, true>) => ({
				secret: configService.get('auth.secret', { infer: true }),
				signOptions: {
					expiresIn: configService.get('auth.expirationTime', '1h', { infer: true }),
				},
			}),
		}),
	],
	controllers: [AuthController],
	providers: [AuthService, LocalStrategyFastify, JwtStrategyFastify, GitLabStrategyFastify],
	exports: [AuthService],
})
export class AuthModule {}
