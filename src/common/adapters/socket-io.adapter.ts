import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { FastifyInstance } from 'fastify';
import { Server, ServerOptions } from 'socket.io';
import { AllConfigTypes } from 'src/config/config.type';

export class SocketIoAdapter extends IoAdapter {
	constructor(private readonly app: INestApplication) {
		super(app);
	}

	createIOServer(port: number, options?: ServerOptions): Server {
		const configService = this.app.get(ConfigService<AllConfigTypes, true>);
		const corsOrigin = configService.get('app.corsOrigin', { infer: true });
		const websocketPath = configService.get('app.websocketPath', { infer: true });

		const serverOptions: Partial<ServerOptions> = {
			...options,
			path: websocketPath,
			cors: {
				origin: corsOrigin === '*' ? true : corsOrigin.split(','),
			},
		};

		const httpServer = this.app.getHttpServer() as FastifyInstance;
		return new Server(httpServer.server, serverOptions);
	}
}
