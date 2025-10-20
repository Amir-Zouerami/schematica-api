import { ApiProperty } from '@nestjs/swagger';
import {
	IsNotEmpty,
	IsString,
	MinLength,
	Validate,
	ValidationArguments,
	ValidatorConstraint,
	ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'notSameAsCurrentPassword', async: false })
export class NotSameAsCurrentPasswordConstraint
	implements ValidatorConstraintInterface
{
	validate(newPassword: string, args: ValidationArguments) {
		const object = args.object as ChangePasswordDto;
		return newPassword !== object.currentPassword;
	}

	defaultMessage() {
		return 'New password cannot be the same as the current password.';
	}
}

export class ChangePasswordDto {
	@ApiProperty({ description: "The user's current password" })
	@IsString()
	@IsNotEmpty()
	currentPassword: string;

	@ApiProperty({ description: 'The desired new password', minLength: 8 })
	@IsString()
	@IsNotEmpty()
	@MinLength(8, {
		message: 'New password must be at least 8 characters long',
	})
	@Validate(NotSameAsCurrentPasswordConstraint)
	newPassword: string;
}
