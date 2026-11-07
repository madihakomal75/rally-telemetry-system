import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { performance } from 'node:perf_hooks';
import { TelemetryPacketDto } from './telemetry-packet.dto';
import { TelemetryEntity } from './entities/telemetry.entity';
import { TelemetryCacheService } from './telemetry-cache.service';
import { LatestVehicleTelemetryDto, TelemetryHistoryPointDto } from './dto/telemetry-response.dto';

const BATCH_SIZE = 100;
const FLUSH_INTERVAL_MS = 500;

export interface TelemetryHistoryOptions {
  startTime?: Date;
  endTime?: Date;
  limit: number;
}

@Injectable()
export class TelemetryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelemetryService.name);
  private pending: TelemetryEntity[] = [];
  private flushTimer?: NodeJS.Timeout;
  private flushInProgress: Promise<void> | null = null;

  constructor(
    @InjectRepository(TelemetryEntity)
    private readonly telemetryRepository: Repository<TelemetryEntity>,
    private readonly telemetryCache: TelemetryCacheService,
  ) {}

  onModuleInit(): void {
    this.flushTimer = setInterval(() => {
      void this.flushPending();
    }, FLUSH_INTERVAL_MS);
  }

  /** Enqueue persistence and start the Redis update without blocking WebSocket broadcast. */
  ingest(packet: TelemetryPacketDto & { timestamp: number }): void {
    void this.telemetryCache.cacheLatest(packet).catch((error: unknown) => {
      this.logger.error(
        `Redis cache update failed for ${packet.vehicleId}`,
        error instanceof Error ? error.stack : String(error),
      );
    });

    const telemetry = this.telemetryRepository.create({
      vehicleId: packet.vehicleId,
      latitude: packet.latitude,
      longitude: packet.longitude,
      location: {
        type: 'Point',
        coordinates: [packet.longitude, packet.latitude],
      },
      speedKmh: packet.speedKmh,
      heading: packet.heading,
      rssi: packet.rssi,
      snr: packet.snr,
      timestamp: new Date(packet.timestamp),
    });

    this.pending.push(telemetry);
    if (this.pending.length >= BATCH_SIZE) {
      void this.flushPending();
    }
  }

  async getLatestActiveVehicles(): Promise<LatestVehicleTelemetryDto[]> {
    const vehicleIds = await this.telemetryCache.getActiveVehicleIds();
    const packets = await Promise.all(
      vehicleIds.map((vehicleId) => this.telemetryCache.getLatest(vehicleId)),
    );
    return packets.filter(
      (packet): packet is NonNullable<typeof packet> => packet !== null,
    );
  }

  async getVehicleIds(): Promise<string[]> {
    const [activeIds, recordedRows] = await Promise.all([
      this.telemetryCache.getActiveVehicleIds(),
      this.telemetryRepository
        .createQueryBuilder('telemetry')
        .select('DISTINCT telemetry.vehicleId', 'vehicleId')
        .getRawMany<{ vehicleId: string }>(),
    ]);

    return [...new Set([
      ...activeIds,
      ...recordedRows.map((row) => row.vehicleId),
    ])].sort();
  }

  async getVehicleHistory(
    vehicleId: string,
    options: TelemetryHistoryOptions,
  ): Promise<TelemetryHistoryPointDto[]> {
    if (
      options.startTime &&
      options.endTime &&
      options.startTime.getTime() > options.endTime.getTime()
    ) {
      throw new BadRequestException('startTime must be earlier than or equal to endTime');
    }

    const query = this.telemetryRepository
      .createQueryBuilder('telemetry')
      .where('telemetry.vehicleId = :vehicleId', { vehicleId });

    if (options.startTime) {
      query.andWhere('telemetry.timestamp >= :startTime', {
        startTime: options.startTime,
      });
    }
    if (options.endTime) {
      query.andWhere('telemetry.timestamp <= :endTime', {
        endTime: options.endTime,
      });
    }

    const records = await query
      .orderBy('telemetry.timestamp', 'ASC')
      .take(options.limit)
      .getMany();

    return records.map((record) => [
      record.longitude,
      record.latitude,
      record.timestamp.getTime(),
      record.speedKmh,
    ]);
  }

  async flushPending(): Promise<void> {
    if (this.flushInProgress) {
      await this.flushInProgress;
      return;
    }
    if (this.pending.length === 0) return;

    const batch = this.pending.splice(0, BATCH_SIZE);
    const startedAt = performance.now();
    this.flushInProgress = this.telemetryRepository
      .insert(batch)
      .then(() => {
        const elapsedMs = performance.now() - startedAt;
        this.logger.log(
          `PostgreSQL inserted ${batch.length} telemetry packets in ${elapsedMs.toFixed(1)} ms`,
        );
      })
      .catch((error: unknown) => {
        this.pending = [...batch, ...this.pending];
        this.logger.error(
          `PostgreSQL batch insert failed after ${(performance.now() - startedAt).toFixed(1)} ms; requeued ${batch.length} packets`,
          error instanceof Error ? error.stack : String(error),
        );
      })
      .finally(() => {
        this.flushInProgress = null;
      });

    await this.flushInProgress;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.flushTimer) clearInterval(this.flushTimer);
    await this.flushPending();
  }
}
