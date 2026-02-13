import { API_GROUP, USER_ROLE } from '@flact/constants';
import { classToPlain } from 'class-transformer';

const { COMMON, COMMON_FULL, COSEC, COSEC_FULL } = API_GROUP;

type GroupOptions = {
  role?: USER_ROLE,
  isFull?: boolean
};

const getApiGroups = ({ role, isFull = false }: GroupOptions): string[] => {
  const groups = [
    COMMON,
    ...isFull ? [COMMON_FULL] : [],
  ];

  if (role === USER_ROLE.CO_SECRETARY) {
    groups.push(COSEC);
    if (isFull) {
      groups.push(COSEC_FULL);
    }
  }
  return groups;
};

export function toPlain<T>(object: T, options: GroupOptions): T {
  return <T>classToPlain(object, { groups: getApiGroups(options), excludeExtraneousValues: true });
}
