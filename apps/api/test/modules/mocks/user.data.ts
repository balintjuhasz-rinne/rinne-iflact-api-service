import { USER_ROLE, USER_STATUS } from '@flact/constants';
import { UserEntity } from '@flact/entities';

export const COSEC_USER: Partial<UserEntity> = {
  id: 2,
  role: USER_ROLE.CO_SECRETARY,
  email: 'cosec@mail.com',
  name: 'Cosign',
  surname: 'Cosign',
  avatar: null,
  avatarId: null,
};

export const COSIGN_USER: Partial<UserEntity> = {
  id: 3,
  role: USER_ROLE.CO_SIGNATORY,
  email: 'cosign@mail.com',
  name: 'Cosec',
  surname: 'Cosec',
  avatar: null,
  avatarId: null,
  status: USER_STATUS.ACTIVE,
};
