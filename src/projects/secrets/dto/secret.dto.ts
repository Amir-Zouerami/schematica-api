import { ApiProperty } from '@nestjs/swagger';
import { Secret } from '@prisma/client';

export class SecretDto {
	@ApiProperty()
	id: number;

	@ApiProperty()
	key: string;

	@ApiProperty()
	value: string; // Plaintext value

	@ApiProperty({ nullable: true })
	description: string | null;

	@ApiProperty()
	createdAt: Date;

	@ApiProperty()
	updatedAt: Date;

	constructor(secret: Secret, decryptedValue: string) {
		this.id = secret.id;
		this.key = secret.key;
		this.value = decryptedValue;
		this.description = secret.description;
		this.createdAt = secret.createdAt;
		this.updatedAt = secret.updatedAt;
	}
}
