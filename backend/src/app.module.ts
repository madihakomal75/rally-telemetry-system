import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehiclesModule } from './vehicles/vehicles.module';
import { TracksModule } from './tracks/tracks.module';
import { TelemetryModule } from './telemetry/telemetry.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'rally_user',
      password: process.env.DB_PASSWORD || 'rally_pass',
      database: process.env.DB_NAME || 'rally_db',
      autoLoadEntities: true,
      migrations: [__dirname + '/telemetry/migrations/*{.ts,.js}'],
      synchronize: false,
    }),
    VehiclesModule,
    TracksModule,
    TelemetryModule,
  ],
})
export class AppModule {}