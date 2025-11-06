import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSecretDto {
	@ApiProperty({
		description: 'The key for the secret (e.g., "STRIPE_API_KEY").',
		example: 'STRIPE_API_KEY',
	})
	@IsString()
	@IsNotEmpty()
	@MinLength(3)
	key: string;

	@ApiProperty({
		description: 'The plaintext value of the secret.',
		example: 'sk_live_123abc456def',
	})
	@IsString()
	@IsNotEmpty()
	value: string;

	@ApiPropertyOptional({
		description: 'An optional description for the secret.',
		example: 'The primary Stripe API key for payment processing.',
	})
	@IsString()
	@IsOptional()
	@IsNotEmpty()
	description?: string;
}
