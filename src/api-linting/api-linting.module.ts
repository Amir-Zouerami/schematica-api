import { Module } from '@nestjs/common';
import { ApiLintingService } from './api-linting.service';

@Module({
	providers: [ApiLintingService],
	exports: [ApiLintingService],
})
export class ApiLintingModule {}
