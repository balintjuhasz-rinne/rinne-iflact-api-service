import { USER_ROLE, USER_STATUS } from '@flact/constants';
import { UserEntity, UserWorkplaceEntity } from '@flact/entities';
import _ from 'lodash';
import { COSIGN_USER } from '../../../mocks/user.data';
import { testCompanies } from '.';

export const cosignatoryCompanyId: number = testCompanies[0].id;

export const baseCosignWorkplace: Partial<UserWorkplaceEntity> = {
  id: 51,
  userId: COSIGN_USER.id,
  companyId: cosignatoryCompanyId,
};
const baseCosignUser = { ...COSIGN_USER, workplaces: [baseCosignWorkplace] };

export const companyUsers: Partial<UserEntity>[] = Array
  .from({ length: 50 }, (_, i) => i + 4)
  .map(index => ({
    id: index,
    name: 'Dark',
    surname: 'Moll',
    email: `com1user${index}@gmail.com`,
    normalizedEmail: `com1user${index}@gmail.com`,
    role: (index % 2 === 0) ? USER_ROLE.CO_SECRETARY : USER_ROLE.CO_SIGNATORY,
    status: (index % 3 === 0) ? USER_STATUS.INACTIVE : USER_STATUS.ACTIVE,
    registrationCompleted: true,
  }));

export const userWorkplaces: Partial<UserWorkplaceEntity>[] = Array
  .from({ length: 50 }, (_, i) => i)
  .map(index => ({
    id: index + 1,
    companyId: _(testCompanies.map(({ id }) => id)).shuffle().head(),
    userId: companyUsers[index].id,
  }));

export const getCompanyUsersForCosecResponse = (companyId) => {
  const workplaces = [baseCosignWorkplace, ...userWorkplaces];
  const userIds = workplaces
    .filter(workplace => workplace.companyId === companyId)
    .map(workplace => workplace.userId);

  return [baseCosignUser, ...companyUsers]
    .filter(user => userIds.some(id => id === user.id) && user.status === USER_STATUS.ACTIVE)
    .map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      surname: user.surname,
      role: user.role,
      status: USER_STATUS.ACTIVE,
      personalId: null,
      phoneNumber: null,
      residentialAddress: null,
      correspondenceAddress: null,
      registrationCompleted: true,
      workplaces: workplaces
        .filter(workplace => workplace.userId === user.id)
        .map(workplace => (
          {
            id: workplace.id,
            companyId: workplace.companyId,
            vetoPower: workplace.vetoPower,
            votingValue: workplace.votingValue,
            positions: [],
          }
        )),
      avatar: user.avatar || null,
    }));
};
