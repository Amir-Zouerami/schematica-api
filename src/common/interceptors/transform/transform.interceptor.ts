import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

import { FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AllConfigTypes } from 'src/config/config.type';

export interface Meta {
	requestId: string;
	apiVersion: string;
	timestamp: string;
}

export interface EnvelopedResponse<T> {
	data: T;
	meta: Meta;
}

@Injectable()
export class TransformInterceptor<T>
	implements NestInterceptor<T, EnvelopedResponse<T>>
{
	constructor(
		private readonly reflector: Reflector,
		private readonly configService: ConfigService<AllConfigTypes, true>,
	) {}

	intercept(
		context: ExecutionContext,
		next: CallHandler,
	): Observable<EnvelopedResponse<T>> {
		const request = context.switchToHttp().getRequest<FastifyRequest>();
		const requestId = request.id;

		const defaultVersionWithoutDecimal = this.configService
			.get('app.version', { infer: true })
			.split('.')[0];

		const apiVersion =
			this.reflector.getAllAndOverride<string>('__version__', [
				context.getHandler(),
				context.getClass(),
			]) ?? defaultVersionWithoutDecimal;

		return next.handle().pipe(
			map((data: T) => ({
				meta: {
					requestId: requestId,
					apiVersion: apiVersion,
					timestamp: new Date().toISOString(),
				},
				data: data,
			})),
		);
	}
}
