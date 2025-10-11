import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { AllConfigTypes } from 'src/config/config.type';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
	imports: [
		PrismaModule,
		PassportModule,
		ConfigModule,
		JwtModule.registerAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (
				configService: ConfigService<AllConfigTypes, true>,
			) => ({
				secret: configService.get('jwt.secret', { infer: true }),
				signOptions: {
					expiresIn: configService.get('jwt.expirationTime', '1h', {
						infer: true,
					}),
				},
			}),
		}),
	],
	controllers: [AuthController],
	providers: [AuthService, LocalStrategy],
})
export class AuthModule {}
