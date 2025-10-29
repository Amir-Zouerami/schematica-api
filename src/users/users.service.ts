import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PaginatedServiceResponse } from 'src/common/interfaces/api-response.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SanitizedUser } from './users.types';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
	constructor(private readonly prisma: PrismaService) {}

	/**
	 * Retrieves a paginated list of all users with sensitive information removed.
	 */
	async findAllPaginated(
		paginationQuery: PaginationQueryDto,
	): Promise<PaginatedServiceResponse<SanitizedUser>> {
		const { limit, skip } = paginationQuery;

		const [users, total] = await this.prisma.$transaction([
			this.prisma.user.findMany({
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
			this.prisma.user.count(),
		]);

		return {
			data: users,
			meta: {
				total,
				page: paginationQuery.page,
				limit: paginationQuery.limit,
				lastPage: Math.ceil(total / limit),
			},
		};
	}

	/**
	 * Updates the password for a given user.
	 *
	 * @param userId The ID of the user whose password is being changed.
	 * @param changePasswordDto The DTO containing the current and new passwords.
	 */
	async updatePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
		if (changePasswordDto.currentPassword === changePasswordDto.newPassword) {
			throw new BadRequestException(
				'New password cannot be the same as the current password.',
			);
		}

		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new NotFoundException('User not found.');
		}

		const isPasswordCorrect = await compare(changePasswordDto.currentPassword, user.password);

		if (!isPasswordCorrect) {
			throw new BadRequestException('Incorrect current password.');
		}

		const newHashedPassword = await hash(changePasswordDto.newPassword, SALT_ROUNDS);

		await this.prisma.user.update({
			where: { id: userId },
			data: {
				password: newHashedPassword,
				tokenVersion: { increment: 1 },
			},
		});
	}
}
