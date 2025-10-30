import { Injectable } from '@nestjs/common';
import { Endpoint, Prisma } from '@prisma/client';
import { type OpenAPIV3 } from 'openapi-types';
import { UserDto } from 'src/auth/dto/user.dto';
import { VALID_HTTP_METHODS } from 'src/common/constants/http.constants';
import { type EndpointAppMetadata, isEndpointAppMetadata } from './spec-reconciliation.types';

/**
 * The data structure for an endpoint that needs to be updated.
 * We need the `id` for the `where` clause and the `operation` for the `data` payload.
 */
export interface EndpointToUpdate {
	id: string;
	operation: Prisma.JsonObject;
	updatedById: string;
}

/**
 * The result of the reconciliation process. This structured object tells the
 * calling service exactly which database operations to perform.
 */
export interface SpecReconciliationResult {
	toCreate: Prisma.EndpointCreateManyInput[];
	toUpdate: EndpointToUpdate[];
	toDeleteIds: string[];
}

@Injectable()
export class SpecReconciliationService {
	reconcile(
		existingEndpoints: Endpoint[],
		newSpec: OpenAPIV3.Document,
		user: UserDto,
		projectId: string,
	): SpecReconciliationResult {
		const now = new Date();
		const nowIso = now.toISOString();

		const existingEndpointsByKey = new Map<string, Endpoint>();
		for (const e of existingEndpoints) {
			existingEndpointsByKey.set(this.createEndpointKey(e.method, e.path), e);
		}

		const toCreate: Prisma.EndpointCreateManyInput[] = [];
		const toUpdate: EndpointToUpdate[] = [];
		const seenKeys = new Set<string>();

		const paths = newSpec.paths ?? {};
		for (const [path, pathItem] of Object.entries(paths)) {
			if (!pathItem) continue;

			for (const [method, operation] of Object.entries(pathItem)) {
				const lowerMethod = method.toLowerCase();
				if (!VALID_HTTP_METHODS.has(lowerMethod)) continue;
				if (typeof operation !== 'object' || operation === null) continue;

				const key = this.createEndpointKey(lowerMethod, path);
				seenKeys.add(key);

				const existing = existingEndpointsByKey.get(key);
				if (existing) {
					const updatedOperation = this.buildUpdatedOperation(
						operation,
						existing,
						user,
						nowIso,
					);

					toUpdate.push({
						id: existing.id,
						operation: updatedOperation as unknown as Prisma.JsonObject,
						updatedById: user.id,
					});
					continue;
				}

				const newOperation = this.buildNewOperation(operation, user, nowIso);
				toCreate.push({
					path,
					method: lowerMethod,
					operation: newOperation as unknown as Prisma.JsonObject,
					projectId,
					creatorId: user.id,
					updatedById: user.id,
				});
			}
		}

		const toDeleteIds: string[] = [];
		for (const [key, endpoint] of existingEndpointsByKey.entries()) {
			if (!seenKeys.has(key)) toDeleteIds.push(endpoint.id);
		}

		return { toCreate, toUpdate, toDeleteIds };
	}

	private createEndpointKey(method: string, path: string): string {
		return `${method.toLowerCase()}:${path}`;
	}

	private buildUpdatedOperation(
		incomingOperation: object,
		existingEndpoint: Endpoint,
		user: UserDto,
		nowIso: string,
	) {
		const opRecord = existingEndpoint.operation as Record<string, unknown>;
		const existingMaybeMeta = opRecord?.['x-app-metadata'];

		const existingMeta: EndpointAppMetadata = isEndpointAppMetadata(existingMaybeMeta)
			? existingMaybeMeta
			: {};

		return {
			...incomingOperation,
			'x-app-metadata': {
				...existingMeta,
				lastEditedBy: user.username,
				lastEditedAt: nowIso,
			},
		};
	}

	private buildNewOperation(incomingOperation: object, user: UserDto, nowIso: string) {
		return {
			...incomingOperation,
			'x-app-metadata': {
				createdBy: user.username,
				createdAt: nowIso,
				lastEditedBy: user.username,
				lastEditedAt: nowIso,
				notes: [],
			},
		};
	}
}
