import { PartialType } from '@nestjs/swagger';
import { CreateSchemaComponentDto } from './create-schema-component.dto';

export class UpdateSchemaComponentDto extends PartialType(CreateSchemaComponentDto) {}
