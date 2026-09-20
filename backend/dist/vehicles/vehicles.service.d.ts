import { Repository } from 'typeorm';
import { Vehicle } from './vehicle.entity';
export declare class VehiclesService {
    private vehiclesRepository;
    constructor(vehiclesRepository: Repository<Vehicle>);
    findAll(): Promise<Vehicle[]>;
    findOne(id: number): Promise<Vehicle | null>;
    create(vehicleData: Partial<Vehicle>): Promise<Vehicle>;
    remove(id: number): Promise<void>;
}
