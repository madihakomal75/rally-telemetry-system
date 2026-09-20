import { TracksService } from './tracks.service';
import { Track } from './track.entity';
export declare class TracksController {
    private readonly tracksService;
    constructor(tracksService: TracksService);
    findAll(): Promise<Track[]>;
    create(trackData: Partial<Track>): Promise<Track>;
}
