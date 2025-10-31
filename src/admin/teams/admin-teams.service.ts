import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { PrismaErrorCode } from 'src/common/constants/prisma-error-codes.constants';
import { TeamConflictException } from 'src/common/exceptions/team-conflict.exception';
import { TeamNotFoundException } from 'src/common/exceptions/team-not-found.exception';
import { handlePrismaError } from 'src/common/utils/prisma-error.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { TeamDto } from 'src/teams/dto/team.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class AdminTeamsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly logger: PinoLogger,
	) {
		this.logger.setContext(AdminTeamsService.name);
	}

	async create(createTeamDto: CreateTeamDto): Promise<TeamDto> {
		const teamName = createTeamDto.name.toLowerCase();

		try {
			const newTeam = await this.prisma.team.create({
				data: {
					id: teamName,
					name: teamName,
				},
			});

			return new TeamDto(newTeam);
		} catch (error) {
			this.logger.error({ error: error as unknown }, 'Failed to create team.');

			handlePrismaError(error, {
				[PrismaErrorCode.UniqueConstraintFailed]: new TeamConflictException(teamName),
			});
		}
	}

	async update(teamId: string, updateTeamDto: UpdateTeamDto): Promise<TeamDto> {
		const newTeamName = updateTeamDto.name.toLowerCase();

		try {
			const updatedTeam = await this.prisma.team.update({
				where: { id: teamId },
				data: {
					id: newTeamName,
					name: newTeamName,
				},
			});

			return new TeamDto(updatedTeam);
		} catch (error) {
			this.logger.error(
				{ error: error as unknown },
				`Failed to update team with ID ${teamId}.`,
			);

			handlePrismaError(error, {
				[PrismaErrorCode.RecordNotFound]: new TeamNotFoundException(teamId),
				[PrismaErrorCode.UniqueConstraintFailed]: new TeamConflictException(newTeamName),
			});
		}
	}

	async remove(teamId: string): Promise<void> {
		try {
			await this.prisma.team.delete({
				where: { id: teamId },
			});
		} catch (error) {
			this.logger.error(
				{ error: error as unknown },
				`Failed to delete team with ID ${teamId}.`,
			);

			handlePrismaError(error, {
				[PrismaErrorCode.RecordNotFound]: new TeamNotFoundException(teamId),
			});
		}
	}
}
