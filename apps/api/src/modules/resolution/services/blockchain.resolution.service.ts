import { Resolution } from './../models/resolution.model';

export interface BlockchainResolutionService {
  createResolution(resolution: Partial<Resolution>): Promise<number>;
}
