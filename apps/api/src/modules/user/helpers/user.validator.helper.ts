import { COMPANY_ERRORS, USER_STATUS } from '@flact/constants';
import { UserWorkplaceEntity } from '@flact/entities';
import { UnprocessableEntityError } from '@flact/exceptions';
import _ from 'lodash';

export const validateWorkplaceDataOrFail = (workplaces: UserWorkplaceEntity[], { id, votingValue }: { id?: number, votingValue: number }): void => {
  const votingSum = _(workplaces)
    .filter(({ user }) => user.id !== id && user.status === USER_STATUS.ACTIVE)
    .map(workplace => workplace.votingValue)
    .push(votingValue)
    .sum();

  if (+votingSum.toFixed(2) > 100) {
    throw new UnprocessableEntityError([{
      field: 'votingValue',
      message: COMPANY_ERRORS.COMPANY_TOTAL_VOTING_VALUES_LIMIT,
      details: { companyId: workplaces[0].companyId },
    }]);
  }
};
