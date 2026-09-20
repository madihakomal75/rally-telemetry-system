import { Repository } from 'typeorm';
import { Track } from './track.entity';
export declare class TracksService {
    private tracksRepository;
    constructor(tracksRepository: Repository<Track>);
    findAll(): Promise<Track[]>;
    create(trackData: Partial<Track>): Promise<Track>;
}
