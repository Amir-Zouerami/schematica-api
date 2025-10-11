import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	/**
	 * Handles user login. The `LocalAuthGuard` is responsible for
	 * processing the request body's credentials and validating the user.
	 * If successful, the user entity is attached to the request, which is
	 * then retrieved by the `CurrentUser` decorator and passed to the service.
	 * Any failure in the guard (bad credentials, malformed body) will result
	 * in a 401 Unauthorized response.
	 */
	@ApiBody({ type: LoginDto })
	@UseGuards(LocalAuthGuard)
	@Post('login')
	login(@CurrentUser() user: Omit<User, 'password'>) {
		return this.authService.login(user);
	}
}
