import { ApiProperty } from '@nestjs/swagger';
import { EndpointStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateEndpointStatusDto {
	@ApiProperty({
		description: 'The desired new status for the endpoint.',
		enum: EndpointStatus,
		enumName: 'EndpointStatus',
		example: EndpointStatus.IN_REVIEW,
	})
	@IsEnum(EndpointStatus)
	@IsNotEmpty()
	status: EndpointStatus;
}
