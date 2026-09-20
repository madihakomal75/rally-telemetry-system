import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('tracks')
export class Track {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('geometry', { spatialFeatureType: 'Polygon', srid: 4326 })
  boundary: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}