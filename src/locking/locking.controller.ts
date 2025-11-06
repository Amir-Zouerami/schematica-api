import { Controller, Delete, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import {
	ApiBearerAuth,
	ApiConflictResponse,
	ApiForbiddenResponse,
	ApiOkResponse,
	ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UserDto } from 'src/auth/dto/user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ProjectOwnerGuard } from 'src/projects/guards/project-owner.guard';
import { EndpointProjectMatchGuard } from './guards/endpoint-project-match.guard';
import { type Lock, LockingService } from './locking.service';

@ApiTags('Locking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/endpoints')
export class LockingController {
	constructor(private readonly lockingService: LockingService) {}

	@Post(':endpointId/lock')
	@UseGuards(EndpointProjectMatchGuard, ProjectOwnerGuard)
	@ApiOkResponse({ description: 'Lock status for the resource.' })
	@ApiForbiddenResponse({ description: 'User does not have ownership of this project.' })
	@ApiConflictResponse({ description: 'Resource is already locked by another user.' })
	acquireLock(@Param('endpointId') endpointId: string, @CurrentUser() user: UserDto): Lock {
		return this.lockingService.acquireLock(endpointId, user);
	}

	@Delete(':endpointId/unlock')
	@HttpCode(HttpStatus.NO_CONTENT)
	@UseGuards(EndpointProjectMatchGuard, ProjectOwnerGuard)
	@ApiOkResponse({ description: 'Lock successfully released.' })
	@ApiForbiddenResponse({ description: 'User does not have ownership of this project.' })
	releaseLock(@Param('endpointId') endpointId: string, @CurrentUser() user: UserDto): void {
		this.lockingService.releaseLock(endpointId, user.id);
	}
}
