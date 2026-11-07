import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

export interface CachedTelemetry {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  heading: number;
  rssi: number;
  snr: number;
  timestamp: number;
  altitude?: number;
}

const ACTIVE_VEHICLES_SET = 'telemetry:active_vehicles';
const ACTIVE_VEHICLES_LAST_SEEN = 'telemetry:active_vehicles:last_seen';
const VEHICLE_TTL_SECONDS = 60;

@Injectable()
export class TelemetryCacheService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async cacheLatest(packet: CachedTelemetry): Promise<void> {
    const now = Date.now();
    const key = `telemetry:latest:${packet.vehicleId}`;

    const pipeline = this.redis.pipeline();
    pipeline.set(key, JSON.stringify(packet), 'EX', VEHICLE_TTL_SECONDS);
    pipeline.sadd(ACTIVE_VEHICLES_SET, packet.vehicleId);
    pipeline.zadd(ACTIVE_VEHICLES_LAST_SEEN, now, packet.vehicleId);
    pipeline.zrangebyscore(
      ACTIVE_VEHICLES_LAST_SEEN,
      '-inf',
      now - VEHICLE_TTL_SECONDS * 1000,
    );

    const results = await pipeline.exec();
    if (!results) throw new Error('Redis cache pipeline returned no results');
    for (const [error] of results) {
      if (error) throw error;
    }

    const staleIds = results[3]?.[1] as string[] | undefined;
    if (staleIds?.length) {
      const cleanup = this.redis.pipeline();
      cleanup.srem(ACTIVE_VEHICLES_SET, ...staleIds);
      cleanup.zrem(ACTIVE_VEHICLES_LAST_SEEN, ...staleIds);
      const cleanupResults = await cleanup.exec();
      if (!cleanupResults) throw new Error('Redis stale vehicle cleanup returned no results');
      for (const [error] of cleanupResults) {
        if (error) throw error;
      }
    }
  }

  async getLatest(vehicleId: string): Promise<CachedTelemetry | null> {
    const value = await this.redis.get(`telemetry:latest:${vehicleId}`);
    return value ? (JSON.parse(value) as CachedTelemetry) : null;
  }

  async getActiveVehicleIds(): Promise<string[]> {
    const expired = await this.redis.zrangebyscore(
      ACTIVE_VEHICLES_LAST_SEEN,
      '-inf',
      Date.now() - VEHICLE_TTL_SECONDS * 1000,
    );

    if (expired.length > 0) {
      const pipeline = this.redis.pipeline();
      pipeline.srem(ACTIVE_VEHICLES_SET, ...expired);
      pipeline.zrem(ACTIVE_VEHICLES_LAST_SEEN, ...expired);
      await pipeline.exec();
    }

    return this.redis.smembers(ACTIVE_VEHICLES_SET);
  }
}
