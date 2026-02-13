import { USER_POSITION, USER_ROLE, USER_STATUS } from '@flact/constants';
import { UserPositionEntity, UserWorkplaceEntity } from '@flact/entities';
import { testCompanies } from '.';

export const deleteCompanyUsers = [
  {
    id: 4,
    email: 'com1user-4@gmail.com',
    normalizedEmail: 'com1user-4@gmail.com',
    name: 'Dark',
    surname: 'Moll',
    role: USER_ROLE.CO_SIGNATORY,
    status: USER_STATUS.ACTIVE,
  },
  {
    id: 5,
    email: 'com1user-5@gmail.com',
    normalizedEmail: 'com1user-5@gmail.com',
    name: 'Dark',
    surname: 'Moll',
    role: USER_ROLE.CO_SIGNATORY,
    status: USER_STATUS.ACTIVE,
  },
];

export const deleteCompanyUsersPositions: Partial<UserPositionEntity>[] = [
  {
    id: 1,
    name: USER_POSITION.DIRECTOR,
    workplaceId: 1,
  },
  {
    id: 2,
    name: USER_POSITION.SHARE_HOLDER,
    workplaceId: 1,
  },
];

export const deleteCompanyWorkplaces: Partial<UserWorkplaceEntity>[] = [
  {
    id: 1,
    userId: 4,
    companyId: testCompanies[0].id,
    votingValue: 30,
    vetoPower: true,
  },
  {
    id: 2,
    userId: 5,
    companyId: testCompanies[0].id,
    votingValue: null,
    vetoPower: false,
  },
];

export const deleteCompanyResponse = (id) => ({
  result: true,
  company: {
    id,
    address: 'Some address',
    name: 'Apple',
    workplaces: [
      {
        id: 1,
        companyId: testCompanies[0].id,
        votingValue: 30,
        vetoPower: true,
        positions: deleteCompanyUsersPositions.map(position => ({
          id: position.id,
          name: position.name,
        })),
      },
      {
        id: 2,
        companyId: testCompanies[0].id,
        votingValue: null,
        vetoPower: false,
        positions: [],
      },
    ],
  },
});
