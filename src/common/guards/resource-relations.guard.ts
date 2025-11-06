import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { PrismaService } from 'src/prisma/prisma.service';
import {
	RESOURCE_RELATIONS_KEY,
	type ResourceRelationsConfig,
} from './check-resource-relations.decorator';

@Injectable()
export class ResourceRelationsGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly prisma: PrismaService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const config = this.reflector.get<ResourceRelationsConfig>(
			RESOURCE_RELATIONS_KEY,
			context.getHandler(),
		);

		if (!config) {
			return true;
		}

		const request = context.switchToHttp().getRequest<FastifyRequest>();
		const params = request.params as Record<string, string>;

		const parentId = params[config.parentParam];
		const childIdStr = params[config.childParam];

		if (!parentId || !childIdStr) {
			throw new Error(
				`ResourceRelationsGuard is missing required URL parameters: '${config.parentParam}' or '${config.childParam}'.`,
			);
		}

		let childId: string | number = childIdStr;

		if (config.childParamIsInt) {
			childId = parseInt(childIdStr, 10);

			if (Number.isNaN(childId)) {
				throw new NotFoundException(
					`Invalid ID format for parameter "${config.childParam}".`,
				);
			}
		}

		let count = 0;
		const whereClause = {
			id: parentId,
			[config.relationName]: {
				some: {
					id: childId,
				},
			},
		};

		switch (config.parentModel) {
			case 'Project':
				count = await this.prisma.project.count({ where: whereClause });
				break;
			case 'Environment':
				count = await this.prisma.environment.count({ where: whereClause });
				break;
			default:
				throw new Error(
					`ResourceRelationsGuard is not configured for the model: '${config.parentModel}'. Please update the guard.`,
				);
		}

		if (count === 0) {
			const childResourceName = config.childModelName || 'Resource';
			const parentResourceName = config.parentModel;
			const message = `${childResourceName} with ID '${childId}' was not found in ${parentResourceName} '${parentId}'.`;
			throw new NotFoundException(message);
		}

		return true;
	}
}
