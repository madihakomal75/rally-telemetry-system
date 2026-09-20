import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'vehicle_number', unique: true })
  vehicleNumber: string;

  @Column({ name: 'driver_name' })
  driverName: string;

  @Column({ default: 'READY' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
