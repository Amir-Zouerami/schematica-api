import { ApiProperty } from '@nestjs/swagger';
import { Environment } from '@prisma/client';

export class EnvironmentDto {
	@ApiProperty()
	id: string;

	@ApiProperty()
	name: string;

	@ApiProperty({ nullable: true, type: 'string' })
	description: string | null;

	@ApiProperty()
	createdAt: Date;

	@ApiProperty()
	updatedAt: Date;

	constructor(environment: Environment) {
		this.id = environment.id;
		this.name = environment.name;
		this.description = environment.description;
		this.createdAt = environment.createdAt;
		this.updatedAt = environment.updatedAt;
	}
}
