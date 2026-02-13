import { Expose, Type } from 'class-transformer';
import { Resolution } from './resolution.model';
import { Voting } from './voting.model';

export class ResolutionInfo {
  @Expose()
  @Type(() => Resolution)
  resolution: Resolution;
  @Expose()
  @Type(() => Voting)
  voting: Voting;
}
