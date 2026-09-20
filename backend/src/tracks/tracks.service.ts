import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Track } from './track.entity';

@Injectable()
export class TracksService {
  constructor(
    @InjectRepository(Track)
    private tracksRepository: Repository<Track>,
  ) {}

  findAll(): Promise<Track[]> {
    return this.tracksRepository.find();
  }

  create(trackData: Partial<Track>): Promise<Track> {
    const track = this.tracksRepository.create(trackData);
    return this.tracksRepository.save(track);
  }
}