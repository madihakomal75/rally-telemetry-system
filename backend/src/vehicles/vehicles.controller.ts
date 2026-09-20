import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { Vehicle } from './vehicle.entity';

@Controller('api/v1/vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  findAll(): Promise<Vehicle[]> {
    return this.vehiclesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Vehicle | null> {
    return this.vehiclesService.findOne(+id);
  }

  @Post()
  create(@Body() vehicleData: Partial<Vehicle>): Promise<Vehicle> {
    return this.vehiclesService.create(vehicleData);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.vehiclesService.remove(+id);
  }
}