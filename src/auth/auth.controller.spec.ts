import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GitLabAuthGuard } from './guards/gitlab-auth.guard';
import { GitLabCallbackGuard } from './guards/gitlab-callback.guard';

describe('AuthController', () => {
	let controller: AuthController;

	const mockAuthService = {};
	const mockPinoLogger = { setContext: jest.fn() };

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [AuthController],
			providers: [
				{ provide: AuthService, useValue: mockAuthService },
				{ provide: PinoLogger, useValue: mockPinoLogger },
				{ provide: GitLabAuthGuard, useValue: { canActivate: () => true } },
				{ provide: GitLabCallbackGuard, useValue: { canActivate: () => true } },
				{ provide: ConfigService, useValue: { get: jest.fn() } },
			],
		}).compile();

		controller = module.get<AuthController>(AuthController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});
});
