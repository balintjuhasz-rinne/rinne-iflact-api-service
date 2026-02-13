import { USER_POSITION } from '@flact/constants';

export class IVotingData {
  positions: USER_POSITION[];
  vetoPower: boolean;
  votingValue: number;
}
