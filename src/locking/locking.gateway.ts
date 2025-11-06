import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
	OnGatewayConnection,
	OnGatewayDisconnect,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets';
import { PinoLogger } from 'nestjs-pino';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from 'src/auth/strategies/jwt.strategy';
import { AllConfigTypes } from 'src/config/config.type';
import { PrismaService } from 'src/prisma/prisma.service';
import { Lock } from './locking.service';

interface SocketAuth {
	token: unknown;
}

// Add userId to the Socket type for internal use after authentication
interface AuthenticatedSocket extends Socket {
	userId?: string;
}

@WebSocketGateway({ namespace: 'locking' })
export class LockingGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server: Server;

	constructor(
		private readonly logger: PinoLogger,
		private readonly jwtService: JwtService,
		private readonly prisma: PrismaService,
		private readonly configService: ConfigService<AllConfigTypes, true>,
	) {
		this.logger.setContext(LockingGateway.name);
	}

	async handleConnection(client: AuthenticatedSocket) {
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

			client.userId = user.id;
			this.logger.info(`Client connected: ${client.id}, user: ${user.username}`);
		} catch (error: unknown) {
			this.logger.warn({ error }, 'Disconnecting client due to invalid token.');
			return client.disconnect();
		}
	}

	handleDisconnect(client: AuthenticatedSocket) {
		this.logger.info(`Client disconnected: ${client.id}`);
	}

	@SubscribeMessage('subscribeToResource')
	async handleSubscribe(client: AuthenticatedSocket, resourceId: string): Promise<void> {
		if (typeof resourceId === 'string' && resourceId) {
			await client.join(`resource:${resourceId}`);
			this.logger.info(`Client ${client.id} subscribed to resource ${resourceId}`);
		}
	}

	@SubscribeMessage('unsubscribeFromResource')
	async handleUnsubscribe(client: AuthenticatedSocket, resourceId: string): Promise<void> {
		if (typeof resourceId === 'string' && resourceId) {
			await client.leave(`resource:${resourceId}`);
			this.logger.info(`Client ${client.id} unsubscribed from resource ${resourceId}`);
		}
	}

	/**
	 * Broadcasts the latest lock status for a resource to all subscribed clients.
	 * @param resourceId The ID of the resource that was updated.
	 * @param lock The current lock information, or null if the lock was released.
	 */
	broadcastLockUpdate(resourceId: string, lock: Lock | null): void {
		this.server.to(`resource:${resourceId}`).emit('lock_updated', lock);
	}
}
