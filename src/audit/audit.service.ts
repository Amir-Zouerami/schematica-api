import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginatedServiceResponse } from 'src/common/interfaces/api-response.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AuditLogDto } from './dto/audit-log.dto';

@Injectable()
export class AuditService {
	constructor(private readonly prisma: PrismaService) {}

	async findAllPaginated(
		query: AuditLogQueryDto,
	): Promise<PaginatedServiceResponse<AuditLogDto>> {
		const { limit, skip, page, actorId, targetId, action } = query;

		const where: Prisma.AuditLogWhereInput = {};
		if (actorId) where.actorId = actorId;
		if (targetId) where.targetId = targetId;
		if (action) where.action = action;

		const [logs, total] = await this.prisma.$transaction([
			this.prisma.auditLog.findMany({
				where,
				include: { actor: true },
				skip,
				take: limit,
				orderBy: { createdAt: 'desc' },
			}),
			this.prisma.auditLog.count({ where }),
		]);

		return {
			data: logs.map((log) => new AuditLogDto(log)),
			meta: {
				total,
				page,
				limit,
				lastPage: Math.ceil(total / limit) || 1,
			},
		};
	}
}
