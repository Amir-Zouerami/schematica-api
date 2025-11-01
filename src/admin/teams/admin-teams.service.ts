import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PinoLogger } from 'nestjs-pino';
import { AuditAction, AuditEvent, AuditLogEvent } from 'src/audit/audit.events';
import { UserDto } from 'src/auth/dto/user.dto';
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
		private readonly eventEmitter: EventEmitter2,
	) {
		this.logger.setContext(AdminTeamsService.name);
	}

	async create(createTeamDto: CreateTeamDto, actor: UserDto): Promise<TeamDto> {
		const teamName = createTeamDto.name.toLowerCase();

		try {
			const newTeam = await this.prisma.team.create({
				data: {
					id: teamName,
					name: teamName,
				},
			});

			this.eventEmitter.emit(AuditEvent, {
				actor,
				action: AuditAction.TEAM_CREATED,
				targetId: newTeam.id,
				details: { name: newTeam.name },
			} satisfies AuditLogEvent);

			return new TeamDto(newTeam);
		} catch (error: unknown) {
			this.logger.error({ error }, 'Failed to create team.');

			handlePrismaError(error, {
				[PrismaErrorCode.UniqueConstraintFailed]: new TeamConflictException(teamName),
			});
		}
	}

	async update(teamId: string, updateTeamDto: UpdateTeamDto, actor: UserDto): Promise<TeamDto> {
		const newTeamName = updateTeamDto.name.toLowerCase();

		try {
			const updatedTeam = await this.prisma.team.update({
				where: { id: teamId },
				data: {
					id: newTeamName,
					name: newTeamName,
				},
			});

			this.eventEmitter.emit(AuditEvent, {
				actor,
				action: AuditAction.TEAM_UPDATED,
				targetId: updatedTeam.id,
				details: { oldId: teamId, newName: updatedTeam.name },
			} satisfies AuditLogEvent);

			return new TeamDto(updatedTeam);
		} catch (error: unknown) {
			this.logger.error({ error }, `Failed to update team with ID ${teamId}.`);

			handlePrismaError(error, {
				[PrismaErrorCode.RecordNotFound]: new TeamNotFoundException(teamId),
				[PrismaErrorCode.UniqueConstraintFailed]: new TeamConflictException(newTeamName),
			});
		}
	}

	async remove(teamId: string, actor: UserDto): Promise<void> {
		try {
			await this.prisma.team.delete({
				where: { id: teamId },
			});

			this.eventEmitter.emit(AuditEvent, {
				actor,
				action: AuditAction.TEAM_DELETED,
				targetId: teamId,
			} satisfies AuditLogEvent);
		} catch (error: unknown) {
			this.logger.error({ error }, `Failed to delete team with ID ${teamId}.`);

			handlePrismaError(error, {
				[PrismaErrorCode.RecordNotFound]: new TeamNotFoundException(teamId),
			});
		}
	}
}
