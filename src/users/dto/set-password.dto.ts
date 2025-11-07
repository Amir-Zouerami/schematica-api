import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SetPasswordDto {
	@ApiProperty({
		description: 'The desired new password for the account.',
		minLength: 8,
	})
	@IsString()
	@IsNotEmpty()
	@MinLength(8, {
		message: 'Password must be at least 8 characters long',
	})
	newPassword: string;
}
