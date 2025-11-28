import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EndpointStatus } from '@prisma/client';
import { IsEnum, IsIn, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { OpenApiOperationDto } from './openapi-operation.dto';

export class CreateEndpointDto {
	@ApiProperty({ example: '/users/{id}' })
	@IsString()
	@IsNotEmpty()
	path: string;

	@ApiProperty({
		description: 'The HTTP method for the endpoint.',
		enum: ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'],
		example: 'get',
	})
	@IsIn(['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'])
	method: string;

	@ApiProperty({
		description: 'A valid OpenAPI Operation Object.',
		type: OpenApiOperationDto,
	})
	@IsObject()
	operation: OpenApiOperationDto;

	@ApiPropertyOptional({
		description: 'The initial status of the endpoint. Defaults to DRAFT if omitted.',
		enum: EndpointStatus,
		example: EndpointStatus.DRAFT,
	})
	@IsEnum(EndpointStatus)
	@IsOptional()
	status?: EndpointStatus;
}
