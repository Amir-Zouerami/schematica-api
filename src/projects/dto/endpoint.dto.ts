import { ApiProperty } from '@nestjs/swagger';
import { Endpoint, Prisma } from '@prisma/client';
import { SanitizedUserDto } from 'src/users/dto/sanitized-user.dto';

export class EndpointDto implements Omit<Endpoint, 'creatorId' | 'updatedById' | 'projectId'> {
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
}
