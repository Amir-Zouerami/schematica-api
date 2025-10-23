import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class ProjectLinkDto {
	@ApiProperty({ example: 'Gitlab Milestone' })
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiProperty({ example: 'https://gitlab.com/...' })
	@IsUrl()
	@IsNotEmpty()
	url: string;
}
