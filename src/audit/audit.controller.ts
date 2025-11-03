import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { PaginatedServiceResponse } from 'src/common/interfaces/api-response.interface';
import { AuditService } from './audit.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AuditLogDto } from './dto/audit-log.dto';

@ApiTags('Admin - Audit Log')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin)
@Controller('admin/audit-logs')
export class AuditController {
	constructor(private readonly auditService: AuditService) {}

	@Get()
	@ApiOkResponse({
		description: 'A paginated and filterable list of audit log entries.',
		type: [AuditLogDto],
	})
	@ApiForbiddenResponse({ description: 'User does not have admin privileges.' })
	findAll(@Query() query: AuditLogQueryDto): Promise<PaginatedServiceResponse<AuditLogDto>> {
		return this.auditService.findAllPaginated(query);
	}
}
