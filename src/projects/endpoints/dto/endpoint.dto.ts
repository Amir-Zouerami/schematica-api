import { ApiProperty } from '@nestjs/swagger';
import { EndpointStatus, Prisma } from '@prisma/client';
import { SanitizedUserDto } from 'src/users/dto/sanitized-user.dto';
import { OpenApiOperationDto } from './openapi-operation.dto';

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

	@ApiProperty({ enum: EndpointStatus, example: EndpointStatus.DRAFT })
	status: EndpointStatus;

	@ApiProperty({
		description: 'The OpenAPI Operation Object for this endpoint.',
		type: OpenApiOperationDto,
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
		this.status = endpoint.status;
		this.operation = endpoint.operation;
		this.createdAt = endpoint.createdAt;
		this.updatedAt = endpoint.updatedAt;
		this.creator = SanitizedUserDto.from(endpoint.creator);
		this.updatedBy = SanitizedUserDto.from(endpoint.updatedBy);
	}
}
