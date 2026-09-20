import { Controller, Get, Post, Body } from '@nestjs/common';
import { TracksService } from './tracks.service';
import { Track } from './track.entity';

@Controller('api/v1/tracks')
export class TracksController {
  constructor(private readonly tracksService: TracksService) {}

  @Get()
  findAll(): Promise<Track[]> {
    return this.tracksService.findAll();
  }

  @Post()
  create(@Body() trackData: Partial<Track>): Promise<Track> {
    return this.tracksService.create(trackData);
  }
}