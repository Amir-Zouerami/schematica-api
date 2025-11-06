import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { EndpointNotFoundInProjectException } from 'src/common/exceptions/endpoint-not-found-in-project.exception';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class EndpointProjectMatchGuard implements CanActivate {
	constructor(private readonly prisma: PrismaService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<FastifyRequest>();
		const { projectId, endpointId } = request.params as {
			projectId?: string;
			endpointId?: string;
		};

		if (!projectId || !endpointId) {
			throw new Error(
				'EndpointProjectMatchGuard requires both projectId and endpointId params.',
			);
		}

		const count = await this.prisma.endpoint.count({
			where: { id: endpointId, projectId: projectId },
		});

		if (count === 0) {
			throw new EndpointNotFoundInProjectException(endpointId, projectId);
		}

		return true;
	}
}
