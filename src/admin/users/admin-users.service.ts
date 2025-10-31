import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { hash } from 'bcrypt';
import { PinoLogger } from 'nestjs-pino';
import { UserDto } from 'src/auth/dto/user.dto';
import { PrismaErrorCode } from 'src/common/constants/prisma-error-codes.constants';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { UserConflictException } from 'src/common/exceptions/user-conflict.exception';
import { UserNotFoundException } from 'src/common/exceptions/user-not-found.exception';
import { PaginatedServiceResponse } from 'src/common/interfaces/api-response.interface';
import { handlePrismaError } from 'src/common/utils/prisma-error.util';
import { AllConfigTypes } from 'src/config/config.type';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const userWithTeamsInclude = {
	teamMemberships: { select: { team: true } },
} satisfies Prisma.UserInclude;

@Injectable()
export class AdminUsersService {
	private readonly SALT_ROUNDS: number;

	constructor(
		private readonly prisma: PrismaService,
		private readonly logger: PinoLogger,
		private readonly configService: ConfigService<AllConfigTypes, true>,
	) {
		this.logger.setContext(AdminUsersService.name);
		this.SALT_ROUNDS = this.configService.get('auth.saltRounds', { infer: true });
	}

	async create(createUserDto: CreateUserDto): Promise<UserDto> {
		const { username, password, role, teams = [] } = createUserDto;
		const normalizedUsername = username.toLowerCase();
		const hashedPassword = await hash(password, this.SALT_ROUNDS);

		try {
			const newUser = await this.prisma.user.create({
				data: {
					username: normalizedUsername,
					password: hashedPassword,
					role,
					teamMemberships: {
						create: teams.map((teamId) => ({
							team: { connect: { id: teamId } },
						})),
					},
				},
				include: userWithTeamsInclude,
			});

			const { password: _, teamMemberships, ...result } = newUser;
			return new UserDto({
				...result,
				teams: teamMemberships.map((m) => m.team),
			});
		} catch (error) {
			this.logger.error({ error: error as unknown }, 'Failed to create user.');

			handlePrismaError(error, {
				[PrismaErrorCode.UniqueConstraintFailed]: new UserConflictException(
					normalizedUsername,
				),
			});
		}
	}

	async findAll(paginationQuery: PaginationQueryDto): Promise<PaginatedServiceResponse<UserDto>> {
		const { skip, limit, page } = paginationQuery;

		try {
			const [users, total] = await this.prisma.$transaction([
				this.prisma.user.findMany({
					include: userWithTeamsInclude,
					skip,
					take: limit,
					orderBy: { username: 'asc' },
				}),
				this.prisma.user.count(),
			]);

			const userDtos = users.map((user) => {
				const { password: _, teamMemberships, ...result } = user;
				return new UserDto({
					...result,
					teams: teamMemberships.map((m) => m.team),
				});
			});

			return {
				data: userDtos,
				meta: {
					total,
					page,
					limit,
					lastPage: Math.ceil(total / limit) || 1,
				},
			};
		} catch (error) {
			this.logger.error({ error: error as unknown }, 'Failed to find all users.');
			handlePrismaError(error);
		}
	}

	async update(userId: string, updateUserDto: UpdateUserDto): Promise<UserDto> {
		const { role, teams } = updateUserDto;

		try {
			const updatedUser = await this.prisma.$transaction(async (tx) => {
				if (teams !== undefined) {
					await tx.teamMembership.deleteMany({
						where: { userId },
					});
				}

				const user = await tx.user.update({
					where: { id: userId },
					data: {
						role,
						teamMemberships:
							teams !== undefined
								? {
										create: teams.map((teamId) => ({
											team: { connect: { id: teamId } },
										})),
									}
								: undefined,
					},
					include: userWithTeamsInclude,
				});

				return user;
			});

			const { password: _, teamMemberships, ...result } = updatedUser;

			return new UserDto({
				...result,
				teams: teamMemberships.map((m) => m.team),
			});
		} catch (error) {
			this.logger.error(
				{ error: error as unknown },
				`Failed to update user with ID ${userId}.`,
			);

			handlePrismaError(error, {
				[PrismaErrorCode.RecordNotFound]: new UserNotFoundException(userId),
			});
		}
	}

	async remove(userId: string): Promise<void> {
		try {
			await this.prisma.user.delete({
				where: { id: userId },
			});
		} catch (error) {
			this.logger.error(
				{ error: error as unknown },
				`Failed to delete user with ID ${userId}.`,
			);

			handlePrismaError(error, {
				[PrismaErrorCode.RecordNotFound]: new UserNotFoundException(userId),
			});
		}
	}
}
