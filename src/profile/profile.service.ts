import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { UserDto } from 'src/auth/dto/user.dto';
import { FilesService } from 'src/common/files/files.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UploadedFile } from 'src/types/fastify';

const userWithTeamsInclude = {
	teamMemberships: { select: { team: true } },
} satisfies Prisma.UserInclude;

@Injectable()
export class ProfileService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly logger: PinoLogger,
		private readonly filesService: FilesService,
	) {
		this.logger.setContext(ProfileService.name);
	}

	async updateProfilePicture(userId: string, file: UploadedFile): Promise<UserDto> {
		try {
			const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

			const newPublicPath = await this.filesService.saveProfilePicture(
				file,
				user.username,
				user.profileImage,
			);

			const updatedUser = await this.prisma.user.update({
				where: { id: userId },
				data: { profileImage: newPublicPath },
				include: userWithTeamsInclude,
			});

			const { password: _, teamMemberships, ...result } = updatedUser;
			return new UserDto({ ...result, teams: teamMemberships.map((m) => m.team) });
		} catch (error) {
			this.logger.error(
				{ error: error as unknown },
				`Failed to update profile picture for user ${userId}.`,
			);

			await this.filesService.deleteFile(file.path);
			throw new InternalServerErrorException('Failed to update profile picture.');
		}
	}
}
