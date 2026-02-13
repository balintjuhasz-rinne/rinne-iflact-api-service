import { USER_ROLE, USER_STATUS } from '@flact/constants';
import { UserWorkplaceEntity } from '@flact/entities';
import { testCompanies } from './base.company.mocks';

export const getCompaniesActiveUser = {
  id: 4,
  email: 'com1user-4@gmail.com',
  normalizedEmail: 'com1user-4@gmail.com',
  name: 'Dark',
  surname: 'Moll',
  role: USER_ROLE.CO_SIGNATORY,
  status: USER_STATUS.ACTIVE,
};

export const getCompaniesInactiveUser = {
  id: 5,
  email: 'com1user-5@gmail.com',
  normalizedEmail: 'com1user-5@gmail.com',
  name: 'Dark',
  surname: 'Moll',
  role: USER_ROLE.CO_SIGNATORY,
  status: USER_STATUS.INACTIVE,
};

export const getCompaniesWorkplaces: Partial<UserWorkplaceEntity>[] = [
  {
    id: 1,
    userId: 4,
    companyId: testCompanies[0].id,
    votingValue: 30.5,
    vetoPower: true,
  },
  {
    id: 2,
    userId: 4,
    companyId: testCompanies[1].id,
    votingValue: null,
    vetoPower: false,
  },
  {
    id: 3,
    userId: 5,
    companyId: testCompanies[1].id,
    votingValue: null,
    vetoPower: false,
  },
];

export const getCompaniesResponse = [
  {
    id: 1,
    address: 'Some address',
    name: 'Apple',
    logo: { id: 1, path: 'path', originalName: 'logo1', size: 200 },
    workplaces: [
      {
        id: 1,
        user: {
          id: 4,
          name: 'Dark',
          surname: 'Moll',
          role: 'CO_SIGNATORY',
          email: 'com1user-4@gmail.com',
          avatar: null,
          status: 'ACTIVE',
        },
        companyId: testCompanies[0].id,
        votingValue: 30.5,
        vetoPower: true,
      },
    ],
  },
  {
    id: 5,
    address: 'Some address',
    name: 'Apple Blog',
    logo: null,
    workplaces: [],
  },
  {
    id: 3,
    address: 'Some address',
    name: 'Apple Sync',
    logo: null,
    workplaces: [],
  },
  {
    id: 4,
    address: 'Some address',
    name: 'Apple Team',
    logo: null,
    workplaces: [],
  },
  {
    id: 2,
    address: 'Some address',
    name: 'Google',
    logo: { id: 2, path: 'path', originalName: 'logo1', size: 200 },
    workplaces: [
      {
        id: 2,
        user: {
          id: 4,
          name: 'Dark',
          surname: 'Moll',
          role: 'CO_SIGNATORY',
          email: 'com1user-4@gmail.com',
          avatar: null,
          status: 'ACTIVE',
        },
        companyId: testCompanies[1].id,
        votingValue: null,
        vetoPower: false,
      },
    ],
  },
];
