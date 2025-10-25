import { Injectable } from '@nestjs/common';
import { Team } from '@prisma/client';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PaginatedServiceResponse } from 'src/common/interfaces/api-response.interface';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TeamsService {
	constructor(private readonly prisma: PrismaService) {}

	/**
	 * Retrieves a paginated list of all teams.
	 */
	async findAllPaginated(
		paginationQuery: PaginationQueryDto,
	): Promise<PaginatedServiceResponse<Team>> {
		const { limit, skip, page } = paginationQuery;

		const [teams, total] = await this.prisma.$transaction([
			this.prisma.team.findMany({
				skip: skip,
				take: limit,
				orderBy: {
					name: 'asc',
				},
			}),
			this.prisma.team.count(),
		]);

		return {
			data: teams,
			meta: {
				total,
				page,
				limit,
				lastPage: Math.ceil(total / limit),
			},
		};
	}
}
