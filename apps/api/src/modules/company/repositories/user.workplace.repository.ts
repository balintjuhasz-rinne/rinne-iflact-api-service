import { UserWorkplaceEntity } from '@flact/entities';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(UserWorkplaceEntity)
export class UserWorkplaceRepository extends Repository<UserWorkplaceEntity> {}
