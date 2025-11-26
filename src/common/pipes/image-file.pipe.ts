import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { UploadedFile } from 'src/types/fastify';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable()
export class ImageFilePipe implements PipeTransform {
	transform(file: UploadedFile | undefined): UploadedFile | undefined {
		if (!file) {
			return undefined;
		}

		if (file.size > MAX_FILE_SIZE) {
			throw new BadRequestException(
				`File size exceeds the limit of ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
			);
		}

		if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
			throw new BadRequestException(
				`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
			);
		}

		return file;
	}
}
