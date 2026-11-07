import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTelemetryTable1728100000000 implements MigrationInterface {
  name = 'CreateTelemetryTable1728100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS postgis');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await queryRunner.query(`
      CREATE TABLE telemetry (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "vehicleId" varchar(64) NOT NULL,
        latitude double precision NOT NULL,
        longitude double precision NOT NULL,
        location geometry(Point, 4326) NOT NULL,
        "speedKmh" real NOT NULL,
        heading real NOT NULL,
        rssi real NOT NULL,
        snr real NOT NULL,
        "timestamp" timestamptz NOT NULL
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_telemetry_vehicle_id" ON telemetry ("vehicleId")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_telemetry_timestamp" ON telemetry ("timestamp")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_telemetry_vehicle_timestamp" ON telemetry ("vehicleId", "timestamp")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_telemetry_location" ON telemetry USING GIST (location)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS telemetry');
  }
}
