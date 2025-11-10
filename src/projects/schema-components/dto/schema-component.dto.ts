import { ApiProperty } from '@nestjs/swagger';
import { type SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { SchemaComponent } from '@prisma/client';

export class SchemaComponentDto {
	@ApiProperty()
	id: string;

	@ApiProperty()
	name: string;

	@ApiProperty({ nullable: true })
	description: string | null;

	@ApiProperty({ type: 'object', additionalProperties: true })
	schema: SchemaObject;

	@ApiProperty()
	createdAt: Date;

	@ApiProperty()
	updatedAt: Date;

	constructor(component: SchemaComponent) {
		this.id = component.id;
		this.name = component.name;
		this.description = component.description;
		this.schema = component.schema as SchemaObject;
		this.createdAt = component.createdAt;
		this.updatedAt = component.updatedAt;
	}
}
