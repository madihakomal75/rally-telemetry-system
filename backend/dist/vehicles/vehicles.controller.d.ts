import { VehiclesService } from './vehicles.service';
import { Vehicle } from './vehicle.entity';
export declare class VehiclesController {
    private readonly vehiclesService;
    constructor(vehiclesService: VehiclesService);
    findAll(): Promise<Vehicle[]>;
    findOne(id: string): Promise<Vehicle | null>;
    create(vehicleData: Partial<Vehicle>): Promise<Vehicle>;
    remove(id: string): Promise<void>;
}
