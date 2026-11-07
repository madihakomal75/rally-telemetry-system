import {
  BadRequestException,
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TelemetryHistoryQueryDto } from './dto/telemetry-history-query.dto';
import {
  LatestVehicleTelemetryDto,
  TelemetryHistoryPointDto,
} from './dto/telemetry-response.dto';
import { TelemetryService } from './telemetry.service';

@ApiTags('Telemetry')
@Controller('api/v1/telemetry')
export class TelemetryController {
  private readonly logger = new Logger(TelemetryController.name);

  constructor(private readonly telemetryService: TelemetryService) {}

  @Get('latest')
  @ApiOperation({ summary: 'Get latest telemetry for active vehicles' })
  @ApiResponse({
    status: 200,
    description: 'Latest cached position and metrics for each active vehicle.',
    type: LatestVehicleTelemetryDto,
    isArray: true,
  })
  @ApiResponse({ status: 500, description: 'Unable to read latest telemetry.' })
  async getLatest(): Promise<LatestVehicleTelemetryDto[]> {
    try {
      return await this.telemetryService.getLatestActiveVehicles();
    } catch (error) {
      this.rethrowHttpError(error, 'Failed to retrieve latest telemetry');
    }
  }

  @Get('vehicles')
  @ApiOperation({ summary: 'List active and historically registered vehicles' })
  @ApiResponse({
    status: 200,
    description: 'Distinct active or previously recorded vehicle IDs.',
    schema: { type: 'array', items: { type: 'string', example: 'CAR_101' } },
  })
  @ApiResponse({ status: 500, description: 'Unable to retrieve vehicle IDs.' })
  async getVehicles(): Promise<string[]> {
    try {
      return await this.telemetryService.getVehicleIds();
    } catch (error) {
      this.rethrowHttpError(error, 'Failed to retrieve vehicle IDs');
    }
  }

  @Get('history/:vehicleId')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  @ApiOperation({ summary: 'Get ordered historical route points for a vehicle' })
  @ApiParam({ name: 'vehicleId', example: 'CAR_101' })
  @ApiQuery({ name: 'startTime', required: false, type: String, format: 'date-time' })
  @ApiQuery({ name: 'endTime', required: false, type: String, format: 'date-time' })
  @ApiQuery({ name: 'limit', required: false, type: Number, minimum: 1, maximum: 2000, default: 500 })
  @ApiResponse({
    status: 200,
    description: '[longitude, latitude, timestamp in epoch milliseconds, speedKmh], ordered by timestamp.',
    schema: {
      type: 'array',
      items: {
        type: 'array',
        minItems: 4,
        maxItems: 4,
        items: { type: 'number' },
      },
      example: [[67.001, 24.8601, 1799999999000, 84.5]],
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid date range or query parameters.' })
  @ApiResponse({ status: 404, description: 'No recorded history exists for this vehicle.' })
  @ApiResponse({ status: 500, description: 'Unable to query vehicle history.' })
  async getHistory(
    @Param('vehicleId') vehicleId: string,
    @Query() query: TelemetryHistoryQueryDto,
  ): Promise<TelemetryHistoryPointDto[]> {
    try {
      const points = await this.telemetryService.getVehicleHistory(vehicleId, {
        startTime: query.startTime ? new Date(query.startTime) : undefined,
        endTime: query.endTime ? new Date(query.endTime) : undefined,
        limit: query.limit ?? 500,
      });

      if (points.length === 0) {
        throw new NotFoundException(`No history found for vehicle ${vehicleId}`);
      }
      return points;
    } catch (error) {
      this.rethrowHttpError(error, `Failed to retrieve history for ${vehicleId}`);
    }
  }

  private rethrowHttpError(error: unknown, message: string): never {
    if (error instanceof HttpException) throw error;

    this.logger.error(message, error instanceof Error ? error.stack : String(error));
    throw new InternalServerErrorException(message);
  }
}
