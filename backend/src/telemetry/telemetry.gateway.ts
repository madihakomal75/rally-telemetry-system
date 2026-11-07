import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TelemetryPacketDto } from './telemetry-packet.dto';
import { TelemetryService } from './telemetry.service';

const TELEMETRY_STREAM_ROOM = 'telemetry:stream';
const TELEMETRY_INGESTOR_ROOM = 'telemetry:submit';

@WebSocketGateway({ cors: { origin: '*' } })
export class TelemetryGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(TelemetryGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly telemetryService: TelemetryService) {}

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('telemetry:stream')
  async subscribeToTelemetry(@ConnectedSocket() client: Socket): Promise<void> {
    await client.join(TELEMETRY_STREAM_ROOM);
    this.logger.log(`Client ${client.id} subscribed to ${TELEMETRY_STREAM_ROOM}`);
  }

  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) =>
        new WsException({
          message: 'Invalid telemetry packet',
          errors: errors.map((error) => ({
            property: error.property,
            constraints: error.constraints ? Object.values(error.constraints) : [],
          })),
        }),
    }),
  )
  @SubscribeMessage('telemetry:submit')
  async handleTelemetrySubmit(
    @ConnectedSocket() client: Socket,
    @MessageBody() packet: TelemetryPacketDto,
  ): Promise<void> {
    await client.join(TELEMETRY_INGESTOR_ROOM);

    const normalizedPacket = {
      vehicleId: packet.vehicleId,
      latitude: packet.latitude,
      longitude: packet.longitude,
      ...(packet.altitude === undefined ? {} : { altitude: packet.altitude }),
      speedKmh: packet.speedKmh,
      heading: packet.heading,
      rssi: packet.rssi,
      snr: packet.snr,
      timestamp:
        typeof packet.timestamp === 'number'
          ? packet.timestamp
          : Date.parse(packet.timestamp),
    };

    this.logger.log(`Received packet from ${packet.vehicleId}`);
    this.telemetryService.ingest(normalizedPacket);
    this.server.to(TELEMETRY_STREAM_ROOM).emit('telemetry:update', normalizedPacket);
  }
}
