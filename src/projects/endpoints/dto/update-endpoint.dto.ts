import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EndpointStatus } from '@prisma/client';
import {
	IsDateString,
	IsEnum,
	IsIn,
	IsNotEmpty,
	IsObject,
	IsOptional,
	IsString,
} from 'class-validator';
import { OpenApiOperationDto } from './openapi-operation.dto';

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
		description: 'A valid OpenAPI Operation Object.',
		type: OpenApiOperationDto,
	})
	@IsObject()
	operation: OpenApiOperationDto;

	@ApiProperty({
		description: 'The last `updatedAt` timestamp for optimistic concurrency control.',
	})
	@IsDateString()
	@IsNotEmpty()
	lastKnownUpdatedAt: string;

	@ApiPropertyOptional({
		description: 'Update the status alongside the content.',
		enum: EndpointStatus,
		example: EndpointStatus.IN_REVIEW,
	})
	@IsEnum(EndpointStatus)
	@IsOptional()
	status?: EndpointStatus;
}
