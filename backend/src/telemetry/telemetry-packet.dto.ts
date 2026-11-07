import {
  IsDefined,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isIsoDateOrEpochMillis', async: false })
class IsIsoDateOrEpochMillis implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value === 'number') {
      return Number.isSafeInteger(value) && value >= 0 && Number.isFinite(new Date(value).getTime());
    }

    if (typeof value !== 'string') {
      return false;
    }

    const isoTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
    return isoTimestamp.test(value) && Number.isFinite(Date.parse(value));
  }

  defaultMessage(): string {
    return 'timestamp must be an ISO 8601 string or non-negative epoch milliseconds';
  }
}

export class TelemetryPacketDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  vehicleId!: string;

  @IsDefined()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsDefined()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsDefined()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  speedKmh!: number;

  @IsDefined()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(360)
  heading!: number;

  @IsDefined()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  rssi!: number;

  @IsDefined()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  snr!: number;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  altitude?: number;

  @IsDefined()
  @Validate(IsIsoDateOrEpochMillis)
  timestamp!: string | number;
}
