import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
	let service: UsersService;

	const mockPrismaService = {};
	const mockConfigService = {
		get: jest.fn((key: string) => {
			if (key === 'auth.saltRounds') {
				return 10;
			}
			return null;
		}),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				UsersService,
				{ provide: PrismaService, useValue: mockPrismaService },
				{ provide: ConfigService, useValue: mockConfigService },
			],
		}).compile();

		service = module.get<UsersService>(UsersService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
