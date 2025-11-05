import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
	OnGatewayConnection,
	OnGatewayDisconnect,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets';
import { PinoLogger } from 'nestjs-pino';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from 'src/auth/strategies/jwt.strategy';
import { AllConfigTypes } from 'src/config/config.type';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationDto } from './dto/notification.dto';

interface SocketAuth {
	token: unknown;
}

@WebSocketGateway()
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server: Server;

	private readonly userSockets = new Map<string, Set<string>>();

	constructor(
		private readonly logger: PinoLogger,
		private readonly jwtService: JwtService,
		private readonly prisma: PrismaService,
		private readonly configService: ConfigService<AllConfigTypes, true>,
	) {
		this.logger.setContext(NotificationsGateway.name);
	}

	async handleConnection(client: Socket) {
		const auth = client.handshake.auth as SocketAuth;
		const token = auth.token;

		if (typeof token !== 'string') {
			return client.disconnect();
		}

		try {
			const payload: JwtPayload = this.jwtService.verify(token, {
				secret: this.configService.get('auth.secret', { infer: true }),
			});

			const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });

			if (!user || user.tokenVersion !== payload.tokenVersion) {
				return client.disconnect();
			}

			const sockets = this.userSockets.get(user.id) ?? new Set<string>();
			sockets.add(client.id);
			this.userSockets.set(user.id, sockets);

			this.logger.info(
				{ socketCount: sockets.size },
				`Client connected: ${client.id}, user: ${user.username}`,
			);
		} catch (_error: unknown) {
			this.logger.warn({ error: _error }, 'Disconnecting client due to invalid token.');
			return client.disconnect();
		}
	}

	handleDisconnect(client: Socket) {
		for (const [userId, socketIds] of this.userSockets.entries()) {
			if (socketIds.has(client.id)) {
				socketIds.delete(client.id);

				if (socketIds.size === 0) {
					this.userSockets.delete(userId);
				}

				break;
			}
		}

		this.logger.info(`Client disconnected: ${client.id}`);
	}

	sendNotificationToUser(userId: string, payload: NotificationDto) {
		const socketIds = this.userSockets.get(userId);
		if (!socketIds) {
			return;
		}

		for (const socketId of socketIds) {
			this.server.to(socketId).emit('notification', payload);
		}
	}
}
