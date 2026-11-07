import { Index, PrimaryGeneratedColumn, Column, Entity } from 'typeorm';

export interface PointGeometry {
  type: 'Point';
  coordinates: [number, number];
}

@Entity({ name: 'telemetry' })
@Index('IDX_telemetry_vehicle_timestamp', ['vehicleId', 'timestamp'])
export class TelemetryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_telemetry_vehicle_id')
  @Column({ type: 'varchar', length: 64 })
  vehicleId!: string;

  @Column({ type: 'double precision' })
  latitude!: number;

  @Column({ type: 'double precision' })
  longitude!: number;

  @Index('IDX_telemetry_location', { spatial: true })
  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })
  location!: PointGeometry;

  @Column({ type: 'float' })
  speedKmh!: number;

  @Column({ type: 'float' })
  heading!: number;

  @Column({ type: 'float' })
  rssi!: number;

  @Column({ type: 'float' })
  snr!: number;

  @Index('IDX_telemetry_timestamp')
  @Column({ type: 'timestamptz' })
  timestamp!: Date;
}
