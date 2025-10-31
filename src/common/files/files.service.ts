import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { promises as fs } from 'node:fs';
import { extname, isAbsolute, join, resolve } from 'node:path';
import { AllConfigTypes } from 'src/config/config.type';
import { UploadedFile } from 'src/types/fastify';

const NORMALIZED_FILE_NAME_TO_DELETE = /^[/\\]+/;

@Injectable()
export class FilesService {
	private readonly uploadDestination: string;

	constructor(
		private readonly logger: PinoLogger,
		private readonly configService: ConfigService<AllConfigTypes, true>,
	) {
		this.logger.setContext(FilesService.name);
		this.uploadDestination = resolve(
			process.cwd(),
			this.configService.get('file.destination', { infer: true }),
		);
	}

	/**
	 * Processes and saves a new profile picture, and cleans up the old one.
	 * @returns The public-facing path to the new profile picture.
	 */
	async saveProfilePicture(
		tempFile: UploadedFile,
		username: string,
		oldImagePath?: string | null,
	): Promise<string> {
		const avatarSubdirectory = 'avatars';
		const fileExtension = extname(tempFile.originalname);
		const newFileName = `${username}${fileExtension}`;
		const newPublicPath = join('/', 'uploads', avatarSubdirectory, newFileName);

		const finalDirectory = join(this.uploadDestination, avatarSubdirectory);
		const finalFilePath = join(finalDirectory, newFileName);

		await fs.mkdir(finalDirectory, { recursive: true });

		await fs.rename(tempFile.path, finalFilePath);

		this.logger.info(`Moved profile picture to ${finalFilePath}`);

		if (oldImagePath) {
			await this.deleteFile(oldImagePath);
		}

		return newPublicPath;
	}

	/**
	 * Deletes a file from the public uploads directory.
	 * @param publicPath The public-facing path (e.g., /uploads/avatars/user.png)
	 */
	async deleteFile(publicPath: string): Promise<void> {
		if (!publicPath) return;

		const normalized = publicPath.replace(NORMALIZED_FILE_NAME_TO_DELETE, '');
		const fullPath = isAbsolute(publicPath)
			? publicPath
			: join(process.cwd(), 'public', normalized);

		try {
			await fs.unlink(fullPath);
			this.logger.info(`Successfully deleted file: ${fullPath}`);
		} catch (error: unknown) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
				this.logger.warn(
					{ error },
					`Could not delete file at ${fullPath}, but continuing operation.`,
				);
			}
		}
	}
}
