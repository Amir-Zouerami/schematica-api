import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions } from 'socket.io';
import type { Server as HttpServer } from 'http';
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
			path: websocketPath || '/socket.io/',
			cors: {
				origin: corsOrigin === '*' ? true : corsOrigin.split(','),
			},
		};

		const httpServer = this.app.getHttpServer() as HttpServer;

		return new Server(httpServer, serverOptions);
	}
}
