import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { SanitizedUserDto } from 'src/users/dto/sanitized-user.dto';

type EndpointWithUsers = Prisma.EndpointGetPayload<{
	include: {
		creator: true;
		updatedBy: true;
	};
}>;

export class EndpointDto {
	@ApiProperty()
	id: string;

	@ApiProperty({ example: '/users/{id}' })
	path: string;

	@ApiProperty({ example: 'get' })
	method: string;

	@ApiProperty({
		description: 'The OpenAPI Operation Object for this endpoint.',
		example: {
			summary: 'Get a specific user',
			responses: { '200': { description: 'User details' } },
		},
	})
	operation: Prisma.JsonValue;

	@ApiProperty()
	createdAt: Date;

	@ApiProperty()
	updatedAt: Date;

	@ApiProperty({ type: () => SanitizedUserDto })
	creator: SanitizedUserDto;

	@ApiProperty({ type: () => SanitizedUserDto })
	updatedBy: SanitizedUserDto;

	constructor(endpoint: EndpointWithUsers) {
		this.id = endpoint.id;
		this.path = endpoint.path;
		this.method = endpoint.method;
		this.operation = endpoint.operation;
		this.createdAt = endpoint.createdAt;
		this.updatedAt = endpoint.updatedAt;
		this.creator = new SanitizedUserDto(endpoint.creator);
		this.updatedBy = new SanitizedUserDto(endpoint.updatedBy);
	}
}
