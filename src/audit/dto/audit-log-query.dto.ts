import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { AuditAction } from '../audit.events';

export class AuditLogQueryDto extends PaginationQueryDto {
	@ApiPropertyOptional({ description: 'Filter by the ID of the user who performed the action.' })
	@IsString()
	@IsOptional()
	actorId?: string;

	@ApiPropertyOptional({ description: 'Filter by the ID of the resource that was affected.' })
	@IsString()
	@IsOptional()
	targetId?: string;

	@ApiPropertyOptional({
		description: 'Filter by a specific action type.',
		enum: AuditAction,
	})
	@IsEnum(AuditAction)
	@IsOptional()
	action?: AuditAction;
}
