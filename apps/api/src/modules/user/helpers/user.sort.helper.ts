import { SORT_ORDER, USER_SORT_PARAM } from '@flact/constants';

export const getCosignSortConditions = (sortParam: USER_SORT_PARAM, sortOrder: SORT_ORDER): { param: string, sortOrder: SORT_ORDER, nulls?: 'NULLS FIRST' | 'NULLS LAST' }[] => {
  switch (sortParam) {
  case USER_SORT_PARAM.NAME:
    return [{ param: 'u.name', sortOrder }];
  case USER_SORT_PARAM.COMPANY_NAME:
    return [{ param: 'c.name', sortOrder }];
  case USER_SORT_PARAM.POSITION:
    return sortOrder === SORT_ORDER.ASC
      ? [{ param: 's.isDirector', sortOrder: SORT_ORDER.DESC }, { param: 's.isShareholder', sortOrder: SORT_ORDER.ASC }]
      : [{ param: 's.isShareholder', sortOrder: SORT_ORDER.DESC }, { param: 's.isDirector', sortOrder: SORT_ORDER.DESC }];
  case USER_SORT_PARAM.VOTING_VALUE:
    return sortOrder === SORT_ORDER.ASC
      ? [{ param: 's.minVotingValue', sortOrder, nulls: 'NULLS LAST' }, { param: 's.maxVotingValue', sortOrder }]
      : [{ param: 's.maxVotingValue', sortOrder, nulls: 'NULLS LAST' }, { param: 's.minVotingValue', sortOrder }];
  default:
    return [{ param: 'u.id', sortOrder }];
  }
};
