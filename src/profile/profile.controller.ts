import { BadRequestException, Controller, Put, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UserDto } from 'src/auth/dto/user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { FileInterceptor, UploadedFile } from 'src/common/interceptors/file.interceptor';
import type { UploadedFile as UploadedFileType } from 'src/types/fastify';
import { ProfileService } from './profile.service';

@ApiTags('Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
	constructor(private readonly profileService: ProfileService) {}

	@Put('picture')
	@UseInterceptors(FileInterceptor)
	@ApiConsumes('multipart/form-data')
	@ApiBody({
		schema: {
			type: 'object',
			required: ['file'],
			properties: {
				file: {
					type: 'string',
					format: 'binary',
				},
			},
		},
	})
	@ApiOkResponse({
		description: 'Profile picture updated successfully.',
		type: UserDto,
	})
	updateProfilePicture(
		@CurrentUser() user: UserDto,
		@UploadedFile() file?: UploadedFileType,
	): Promise<UserDto> {
		if (!file) {
			throw new BadRequestException('Profile picture file is required.');
		}
		return this.profileService.updateProfilePicture(user.id, file);
	}
}
