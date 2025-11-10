import { Injectable } from '@nestjs/common';
import { Endpoint, Prisma, Project, SchemaComponent } from '@prisma/client';

type BuilderEndpoint = Pick<Endpoint, 'path' | 'method' | 'operation'>;
type BuilderSchemaComponent = Pick<SchemaComponent, 'name' | 'schema'>;

@Injectable()
export class OpenApiSpecBuilder {
	/**
	 * Assembles a full OpenAPI 3.0 specification object from normalized database records.
	 * @param project The project metadata.
	 * @param endpoints A list of all endpoints associated with the project.
	 * @param components A list of all reusable schema components for the project.
	 * @returns A valid OpenAPI 3.0 specification as a JSON object.
	 */
	build(
		project: Project,
		endpoints: BuilderEndpoint[],
		components: BuilderSchemaComponent[],
	): Prisma.JsonValue {
		const paths: Record<string, Record<string, Prisma.JsonValue>> = {};

		for (const endpoint of endpoints) {
			if (!paths[endpoint.path]) {
				paths[endpoint.path] = {};
			}

			paths[endpoint.path][endpoint.method.toLowerCase()] = endpoint.operation;
		}

		const schemaComponents: Record<string, Prisma.JsonValue> = {};
		for (const component of components) {
			schemaComponents[component.name] = component.schema;
		}

		return {
			openapi: '3.0.0',
			info: {
				title: project.name,
				description: project.description,
				version: '1.0.0',
			},
			servers: project.serverUrl ? [{ url: project.serverUrl }] : [],
			paths: paths,
			...(Object.keys(schemaComponents).length > 0 && {
				components: {
					schemas: schemaComponents,
				},
			}),
		};
	}
}
