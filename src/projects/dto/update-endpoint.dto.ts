import { ApiProperty } from '@nestjs/swagger';
import { type OperationObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { IsDateString, IsIn, IsNotEmpty, IsObject, IsString } from 'class-validator';

export class UpdateEndpointDto {
	@ApiProperty({ example: '/users/new/{id}' })
	@IsString()
	@IsNotEmpty()
	path: string;

	@ApiProperty({
		enum: ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'],
		example: 'put',
	})
	@IsIn(['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'])
	method: string;

	@ApiProperty({
		example: {
			summary: 'Update a specific user',
			responses: { '200': { description: 'User updated' } },
		},
	})
	@IsObject()
	operation: OperationObject;

	@ApiProperty({
		description: 'The last `updatedAt` timestamp for optimistic concurrency control.',
	})
	@IsDateString()
	@IsNotEmpty()
	lastKnownUpdatedAt: string;
}
