import { Injectable } from '@nestjs/common';
import { Endpoint, Prisma } from '@prisma/client';
import { OpenAPIV3 } from 'openapi-types';
import { UserDto } from 'src/auth/dto/user.dto';
import { VALID_HTTP_METHODS } from 'src/common/constants/http.constants';
import { EndpointAppMetadata, isEndpointAppMetadata } from './spec-reconciliation.types';

export interface EndpointToUpdate {
	id: string;
	operation: Prisma.JsonObject;
	updatedById: string;
}

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
		const nowIso = new Date().toISOString();
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

			for (const method of Object.keys(pathItem)) {
				const lowerMethod = method.toLowerCase();
				if (!VALID_HTTP_METHODS.has(lowerMethod)) continue;

				const operation = pathItem[
					method as keyof typeof pathItem
				] as OpenAPIV3.OperationObject;

				if (typeof operation !== 'object' || operation === null || '$ref' in operation) {
					continue;
				}

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
						operation: updatedOperation,
						updatedById: user.id,
					});
					continue;
				}

				const newOperation = this.buildNewOperation(operation, user, nowIso);
				toCreate.push({
					path,
					method: lowerMethod,
					operation: newOperation,
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
		incomingOperation: OpenAPIV3.OperationObject,
		existingEndpoint: Endpoint,
		user: UserDto,
		nowIso: string,
	): Prisma.JsonObject {
		const opRecord = existingEndpoint.operation as Prisma.JsonObject;
		const existingMetadata = opRecord?.['x-app-metadata'] ?? null;

		const baseMetadata: EndpointAppMetadata = isEndpointAppMetadata(existingMetadata)
			? existingMetadata
			: {
					createdBy: 'unknown',
					createdAt: existingEndpoint.createdAt.toISOString(),
					lastEditedBy: user.username,
					lastEditedAt: nowIso,
				};

		const updatedMetadata: EndpointAppMetadata = {
			...baseMetadata,
			lastEditedBy: user.username,
			lastEditedAt: nowIso,
		};

		const newOperation = incomingOperation as unknown as Prisma.JsonObject;
		newOperation['x-app-metadata'] = updatedMetadata;
		return newOperation;
	}

	private buildNewOperation(
		incomingOperation: OpenAPIV3.OperationObject,
		user: UserDto,
		nowIso: string,
	): Prisma.JsonObject {
		const newMetadata: EndpointAppMetadata = {
			createdBy: user.username,
			createdAt: nowIso,
			lastEditedBy: user.username,
			lastEditedAt: nowIso,
		};

		const newOperation = incomingOperation as unknown as Prisma.JsonObject;
		newOperation['x-app-metadata'] = newMetadata;
		return newOperation;
	}
}
