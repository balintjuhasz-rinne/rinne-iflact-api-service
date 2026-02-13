import { USER_POSITION } from '@flact/constants';
import { UserEntity } from '@flact/entities';
import { Expose, Type } from 'class-transformer';

export class CosignatoryVote extends UserEntity {
  @Expose()
  vote: string;
  @Expose()
  voteDate: string;
  @Expose()
  votingValue: number;
  @Expose()
  vetoPower: boolean;
  @Expose()
  position: USER_POSITION;
}

export class Voting {
  @Expose()
  acceptCounter: number;
  @Expose()
  rejectCounter: number;
  @Expose()
  threshold: number;
  @Expose()
  directorsCount: number;
  @Expose()
  @Type(() => CosignatoryVote)
  cosignatories: CosignatoryVote[];
}
