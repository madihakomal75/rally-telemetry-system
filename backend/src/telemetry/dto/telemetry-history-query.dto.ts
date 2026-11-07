import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class TelemetryHistoryQueryDto {
  @IsOptional()
  @IsDateString({ strict: true })
  startTime?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  endTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2000)
  limit?: number;
}
