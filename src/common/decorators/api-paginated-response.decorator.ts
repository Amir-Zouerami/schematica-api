import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { PaginationMetaDto } from '../dto/paginated-response.dto';

/**
 * A custom decorator to document paginated API responses.
 *
 * It wraps the response in a standard structure with `data` and `meta` properties.
 *
 * @param model The DTO class for the items in the paginated `data` array.
 */
export const ApiPaginatedResponse = <TModel extends Type<object>>(model: TModel) => {
	return applyDecorators(
		ApiExtraModels(PaginationMetaDto, model),
		ApiOkResponse({
			description: 'A paginated list of results.',
			schema: {
				properties: {
					data: {
						type: 'array',
						items: { $ref: getSchemaPath(model) },
					},
					meta: {
						$ref: getSchemaPath(PaginationMetaDto),
					},
				},
			},
		}),
	);
};
