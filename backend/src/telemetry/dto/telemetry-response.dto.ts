import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LatestVehicleTelemetryDto {
  @ApiProperty({ example: 'CAR_101' })
  vehicleId!: string;

  @ApiProperty({ example: 24.8601 })
  latitude!: number;

  @ApiProperty({ example: 67.001 })
  longitude!: number;

  @ApiProperty({ example: 84.5 })
  speedKmh!: number;

  @ApiProperty({ example: 142 })
  heading!: number;

  @ApiProperty({ example: -96.4 })
  rssi!: number;

  @ApiProperty({ example: 7.2 })
  snr!: number;

  @ApiProperty({ example: 1799999999000, description: 'Epoch milliseconds' })
  timestamp!: number;

  @ApiPropertyOptional({ example: 150 })
  altitude?: number;
}

/** [longitude, latitude, timestamp in epoch milliseconds, speedKmh] */
export type TelemetryHistoryPointDto = [number, number, number, number];
