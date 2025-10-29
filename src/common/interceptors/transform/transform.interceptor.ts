import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

import { FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
	ApiResponse,
	isPaginatedServiceResponse,
	PaginatedApiResponse,
	PaginatedServiceResponse,
	RequestMeta,
} from 'src/common/interfaces/api-response.interface';
import { AllConfigTypes } from 'src/config/config.type';

@Injectable()
export class TransformInterceptor<T>
	implements
		NestInterceptor<T | PaginatedServiceResponse<T>, ApiResponse<T> | PaginatedApiResponse<T>>
{
	constructor(
		private readonly reflector: Reflector,
		private readonly configService: ConfigService<AllConfigTypes, true>,
	) {}

	intercept(
		context: ExecutionContext,
		next: CallHandler<T | PaginatedServiceResponse<T>>,
	): Observable<ApiResponse<T> | PaginatedApiResponse<T>> {
		const request = context.switchToHttp().getRequest<FastifyRequest>();
		const defaultVersion = this.configService.get('app.version', { infer: true }).split('.')[0];

		const apiVersion =
			this.reflector.getAllAndOverride<string>('__version__', [
				context.getHandler(),
				context.getClass(),
			]) ?? defaultVersion;

		return next.handle().pipe(
			map((data): ApiResponse<T> | PaginatedApiResponse<T> => {
				const requestMeta: RequestMeta = {
					requestId: request.id,
					apiVersion: apiVersion,
					timestamp: new Date().toISOString(),
				};

				if (isPaginatedServiceResponse<T>(data)) {
					return {
						meta: {
							...requestMeta,
							...data.meta,
						},
						data: data.data,
					};
				}

				return {
					meta: requestMeta,
					data: data,
				};
			}),
		);
	}
}
