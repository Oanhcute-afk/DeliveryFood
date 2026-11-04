import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LocationService } from '../location/location.service';
import { MetricsService } from '../monitor/metrics.service';

export interface DriverLocation {
  driverId: string;
  orderId: string;
  latitude: number;
  longitude: number;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/orders',
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private locationService: LocationService,
    private metrics: MetricsService,
  ) {}

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    this.metrics.wsConnected();
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.metrics.wsDisconnected();
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:order')
  handleJoinOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() orderId: string,
  ) {
    client.join(`order:${orderId}`);
    console.log(`Client ${client.id} joined order:${orderId}`);
  }

  @SubscribeMessage('join:restaurant')
  handleJoinRestaurant(
    @ConnectedSocket() client: Socket,
    @MessageBody() restaurantId: string,
  ) {
    client.join(`restaurant:${restaurantId}`);
    console.log(`Client ${client.id} joined restaurant:${restaurantId}`);
  }

  @SubscribeMessage('join:driver')
  handleJoinDriver(
    @ConnectedSocket() client: Socket,
    @MessageBody() driverId: string,
  ) {
    client.join(`driver:${driverId}`);
    console.log(`Client ${client.id} joined driver:${driverId}`);
  }

  emitDriverAssigned(driverId: string, order: Record<string, unknown>) {
    try {
      this.server?.to(`driver:${driverId}`).emit('driver:assigned', order);
    } catch (err) {
      console.warn('Failed to emit driver:assigned', err);
    }
  }

  emitOrderChat(orderId: string, message: unknown) {
    try {
      this.server?.to(`order:${orderId}`).emit('order:chat', message);
    } catch (err) {
      console.warn('Failed to emit order:chat', err);
    }
  }

  @SubscribeMessage('order:chat')
  handleOrderChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { orderId: string; message: unknown },
  ) {
    if (payload?.orderId) {
      try {
        this.server
          ?.to(`order:${payload.orderId}`)
          .emit('order:chat', payload.message);
      } catch (err) {
        console.warn('Failed to relay order:chat', err);
      }
    }
  }

  @SubscribeMessage('driver:location')
  async handleDriverLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() location: DriverLocation,
  ) {
    // persist so late-joining customers see current position
    await this.locationService.saveDriverLocation(
      location.orderId,
      location.latitude,
      location.longitude,
    );

    // forward to everyone in order:<orderId> room (customer tracking screen)
    this.server
      .to(`order:${location.orderId}`)
      .emit('driver:location', location);
  }

  emitOrderUpdate(order: {
    id: string;
    restaurantId: string;
    status: string;
    [key: string]: unknown;
  }) {
    // → customer watching this order
    this.server.to(`order:${order.id}`).emit('order:updated', order);
    // → owner dashboard for this restaurant
    this.server
      .to(`restaurant:${order.restaurantId}`)
      .emit('order:updated', order);
  }
}
