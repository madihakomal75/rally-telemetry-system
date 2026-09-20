import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './vehicle.entity';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private vehiclesRepository: Repository<Vehicle>,
  ) {}

  findAll(): Promise<Vehicle[]> {
    return this.vehiclesRepository.find();
  }

  findOne(id: number): Promise<Vehicle | null> {
    return this.vehiclesRepository.findOneBy({ id });
  }

  create(vehicleData: Partial<Vehicle>): Promise<Vehicle> {
    const vehicle = this.vehiclesRepository.create(vehicleData);
    return this.vehiclesRepository.save(vehicle);
  }

  async remove(id: number): Promise<void> {
    await this.vehiclesRepository.delete(id);
  }
}