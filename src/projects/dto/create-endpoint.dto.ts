import { ApiProperty } from '@nestjs/swagger';
import { type OperationObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { IsIn, IsNotEmpty, IsObject, IsString } from 'class-validator';

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
		example: {
			summary: 'Get a specific user',
			responses: { '200': { description: 'User details' } },
		},
	})
	@IsObject()
	operation: OperationObject;
}
