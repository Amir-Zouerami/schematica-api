import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { compare, hash } from 'bcrypt';
import { PinoLogger } from 'nestjs-pino';
import { PaginationSearchQueryDto } from 'src/common/dto/pagination-search-query.dto';
import { PaginatedServiceResponse } from 'src/common/interfaces/api-response.interface';
import { AllConfigTypes } from 'src/config/config.type';
import { PrismaService } from 'src/prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SanitizedUserDto } from './dto/sanitized-user.dto';
import { SetPasswordDto } from './dto/set-password.dto';

@Injectable()
export class UsersService {
	private readonly SALT_ROUNDS: number;

	constructor(
		private readonly prisma: PrismaService,
		private readonly configService: ConfigService<AllConfigTypes, true>,
		private readonly logger: PinoLogger,
	) {
		this.logger.setContext(UsersService.name);
		this.SALT_ROUNDS = this.configService.get('auth.saltRounds', { infer: true });
	}

	/**
	 * Retrieves a paginated list of all users with sensitive information removed.
	 */
	async findAllPaginated(
		paginationQuery: PaginationSearchQueryDto,
	): Promise<PaginatedServiceResponse<SanitizedUserDto>> {
		const { limit, skip, search } = paginationQuery;

		const where: Prisma.UserWhereInput = search
			? {
					username: {
						contains: search.toLowerCase(),
					},
				}
			: {};

		const [users, total] = await this.prisma.$transaction([
			this.prisma.user.findMany({
				where,
				select: {
					id: true,
					username: true,
					profileImage: true,
				},
				skip: skip,
				take: limit,
				orderBy: {
					username: 'asc',
				},
			}),
			this.prisma.user.count({ where }),
		]);

		return {
			data: users.map((user) => new SanitizedUserDto(user)),
			meta: {
				total,
				page: paginationQuery.page,
				limit: paginationQuery.limit,
				lastPage: Math.ceil(total / limit) || 1,
			},
		};
	}

	/**
	 * Updates the password for a given user who already has a password.
	 *
	 * @param userId The ID of the user whose password is being changed.
	 * @param changePasswordDto The DTO containing the current and new passwords.
	 */
	async updatePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new NotFoundException('User not found.');
		}

		if (!user.password) {
			throw new BadRequestException(
				'This account does not have a password set. Please use the set-password endpoint first.',
			);
		}

		const isPasswordCorrect = await compare(changePasswordDto.currentPassword, user.password);

		if (!isPasswordCorrect) {
			throw new BadRequestException('Incorrect current password.');
		}

		const newHashedPassword = await hash(changePasswordDto.newPassword, this.SALT_ROUNDS);

		await this.prisma.user.update({
			where: { id: userId },
			data: {
				password: newHashedPassword,
				tokenVersion: { increment: 1 },
			},
		});
	}

	/**
	 * Sets a password for a user who was provisioned via OAuth and does not yet have one.
	 *
	 * @param userId The ID of the user setting their password.
	 * @param setPasswordDto The DTO containing the new password.
	 */
	async setPassword(userId: string, setPasswordDto: SetPasswordDto): Promise<void> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new NotFoundException('User not found.');
		}

		if (user.password) {
			throw new BadRequestException(
				'This account already has a password. Please use the change-password endpoint.',
			);
		}

		const newHashedPassword = await hash(setPasswordDto.newPassword, this.SALT_ROUNDS);

		await this.prisma.user.update({
			where: { id: userId },
			data: {
				password: newHashedPassword,
				tokenVersion: { increment: 1 },
			},
		});
	}
}
