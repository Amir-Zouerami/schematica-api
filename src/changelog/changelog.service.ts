import { Injectable } from '@nestjs/common';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PaginatedServiceResponse } from 'src/common/interfaces/api-response.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { ChangelogDto } from './dto/changelog.dto';

@Injectable()
export class ChangelogService {
	constructor(private readonly prisma: PrismaService) {}

	async findAllForProject(
		projectId: string,
		paginationQuery: PaginationQueryDto,
	): Promise<PaginatedServiceResponse<ChangelogDto>> {
		const { limit, skip, page } = paginationQuery;
		const where = { projectId };

		const [changelogs, total] = await this.prisma.$transaction([
			this.prisma.changelog.findMany({
				where,
				include: { actor: true },
				skip: skip,
				take: limit,
				orderBy: { createdAt: 'desc' },
			}),
			this.prisma.changelog.count({ where }),
		]);

		return {
			data: changelogs.map((log) => new ChangelogDto(log)),
			meta: {
				total,
				page,
				limit,
				lastPage: Math.ceil(total / limit) || 1,
			},
		};
	}
}
