import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '../redis/redis.module';
import { TelemetryCacheService } from './telemetry-cache.service';
import { TelemetryController } from './telemetry.controller';
import { TelemetryEntity } from './entities/telemetry.entity';
import { TelemetryGateway } from './telemetry.gateway';
import { TelemetryService } from './telemetry.service';

@Module({
  controllers: [TelemetryController],
  imports: [RedisModule, TypeOrmModule.forFeature([TelemetryEntity])],
  providers: [TelemetryGateway, TelemetryService, TelemetryCacheService],
  exports: [TelemetryService, TelemetryCacheService],
})
export class TelemetryModule {}
