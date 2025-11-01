import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationSearchQueryDto } from 'src/common/dto/pagination-search-query.dto';
import { PaginatedServiceResponse } from 'src/common/interfaces/api-response.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { TeamDto } from './dto/team.dto';

@Injectable()
export class TeamsService {
	constructor(private readonly prisma: PrismaService) {}

	/**
	 * Retrieves a paginated list of all teams.
	 */
	async findAllPaginated(
		paginationQuery: PaginationSearchQueryDto,
	): Promise<PaginatedServiceResponse<TeamDto>> {
		const { limit, skip, page, search } = paginationQuery;

		const where: Prisma.TeamWhereInput = search
			? {
					name: {
						contains: search.toLowerCase(),
					},
				}
			: {};

		const [teams, total] = await this.prisma.$transaction([
			this.prisma.team.findMany({
				where,
				skip: skip,
				take: limit,
				orderBy: {
					name: 'asc',
				},
			}),
			this.prisma.team.count({ where }),
		]);

		return {
			data: teams.map((team) => new TeamDto(team)),
			meta: {
				total,
				page,
				limit,
				lastPage: Math.ceil(total / limit) || 1,
			},
		};
	}
}
