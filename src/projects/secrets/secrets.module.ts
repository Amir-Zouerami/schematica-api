import { Module } from '@nestjs/common';
import { EncryptionModule } from 'src/encryption/encryption.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GuardsModule } from '../guards/guards.module';
import { SecretsController } from './secrets.controller';
import { SecretsService } from './secrets.service';

@Module({
	imports: [PrismaModule, GuardsModule, EncryptionModule],
	controllers: [SecretsController],
	providers: [SecretsService],
})
export class SecretsModule {}
