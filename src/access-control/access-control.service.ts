import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UserDto } from 'src/auth/dto/user.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AccessControlService {
	constructor(private readonly prisma: PrismaService) {}

	/**
	 * Checks if a user has OWNER-level access to a given project.
	 * Admins always have access.
	 *
	 * @param user The user performing the action.
	 * @param projectId The ID of the project to check.
	 * @returns `true` if the user has owner access, `false` otherwise.
	 */
	async canOwnProject(user: UserDto, projectId: string): Promise<boolean> {
		if (user.role === Role.admin) {
			return true;
		}

		const userTeamIds = user.teams?.map((t) => t.id) ?? [];

		const accessCount = await this.prisma.project.count({
			where: {
				id: projectId,
				OR: [
					{ userAccesses: { some: { userId: user.id, type: 'OWNER' } } },
					{ teamAccesses: { some: { teamId: { in: userTeamIds }, type: 'OWNER' } } },
				],
			},
		});

		return accessCount > 0;
	}

	/**
	 * Checks if a user has at least VIEWER-level access to a given project.
	 * Admins always have access. Denied users are explicitly forbidden.
	 *
	 * @param user The user performing the action.
	 * @param projectId The ID of the project to check.
	 * @returns `true` if the user can view the project, `false` otherwise.
	 */
	async canViewProject(user: UserDto, projectId: string): Promise<boolean> {
		if (user.role === Role.admin) {
			return true;
		}

		const userTeamIds = user.teams?.map((t) => t.id) ?? [];

		const accessCount = await this.prisma.project.count({
			where: {
				id: projectId,
				deniedUsers: { none: { id: user.id } },
				OR: [
					{ userAccesses: { some: { userId: user.id } } },
					{ teamAccesses: { some: { teamId: { in: userTeamIds } } } },
				],
			},
		});

		return accessCount > 0;
	}
}
