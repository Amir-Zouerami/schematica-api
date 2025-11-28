import { ApiProperty } from '@nestjs/swagger';

// This is a placeholder class. Its only purpose is to provide a name
// that I can reference with `getSchemaPath`. I will manually overwrite
// the schema for this class in my swagger.ts setup.
export class OpenApiOperationDto {
	// Add at least one property to ensure NestJS doesn't ignore the class.
	@ApiProperty()
	summary?: string;
}
