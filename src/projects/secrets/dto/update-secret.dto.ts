import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateSecretDto {
	@ApiPropertyOptional({
		description: 'The new plaintext value of the secret.',
		example: 'sk_live_789ghi012jkl',
	})
	@IsString()
	@IsOptional()
	@IsNotEmpty()
	value?: string;

	@ApiPropertyOptional({
		description: 'The new description for the secret.',
		example: 'Rotated Stripe API key for Q4.',
	})
	@IsString()
	@IsOptional()
	@IsNotEmpty()
	description?: string;
}
