import { SetMetadata } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export const RESOURCE_RELATIONS_KEY = 'resourceRelations';

type PrismaModelName = keyof Prisma.TypeMap['model'];

export interface ResourceRelationsConfig {
	// The name of the Prisma model for the parent resource
	parentModel: PrismaModelName;
	// The name of the URL parameter for the parent
	parentParam: string;
	// The name of the field on the parent model that links to the children
	relationName: string;

	// The name of the child being checked
	childModelName?: string;
	// The name of the URL parameter for the child being checked
	childParam: string;
	// Does the child's ID need to be parsed as an integer?
	childParamIsInt?: boolean;
}

export const CheckResourceRelations = (config: ResourceRelationsConfig) =>
	SetMetadata(RESOURCE_RELATIONS_KEY, config);
