import { All, Controller, Headers, Param, Req, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
	ApiBearerAuth,
	ApiHeader,
	ApiNotFoundResponse,
	ApiOkResponse,
	ApiParam,
	ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UserDto } from 'src/auth/dto/user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { MockServerService } from './mock-server.service';

@ApiTags('Mock Server')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mock')
export class MockServerController {
	constructor(private readonly mockServerService: MockServerService) {}

	@All('*')
	@ApiParam({
		name: 'projectId',
		description: 'The ID of the project to generate a mock response for.',
	})
	@ApiParam({
		name: '*',
		description: 'The API path to mock (e.g., "users/123/profile").',
	})
	@ApiHeader({
		name: 'x-mock-status-code',
		description: 'An optional status code to force the mock server to return.',
		required: false,
		example: '404',
	})
	@ApiHeader({
		name: 'x-mock-project-id',
		description: 'The ID of the project whose specification should be used for mocking.',
		required: true,
	})
	@ApiHeader({
		name: 'x-mock-locale',
		description: 'An optional locale to generate mock data in (e.g., "fa" for Persian).',
		required: false,
		example: 'fa',
	})
	@ApiOkResponse({
		description:
			"A dynamically generated mock response based on the project's OpenAPI specification.",
	})
	@ApiNotFoundResponse({
		description: 'The project or the requested API path was not found in the specification.',
	})
	async handleMockRequest(
		@Param('*') mockPath: string,
		@Headers('x-mock-project-id') projectId: string | undefined,
		@Headers('x-mock-status-code') requestedStatusCode: string | undefined,
		@Headers('x-mock-locale') requestedLocale: string | undefined,
		@Req() req: FastifyRequest,
		@Res() res: FastifyReply,
		@CurrentUser() user: UserDto,
	): Promise<void> {
		const result = await this.mockServerService.generateMockResponse(
			projectId,
			req.method,
			`/${mockPath}`,
			user,
			requestedStatusCode,
			requestedLocale,
		);

		await res.status(result.statusCode).send(result.body);
	}
}
