import { UserPositionEntity } from '@flact/entities';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(UserPositionEntity)
export class UserPositionRepository extends Repository<UserPositionEntity> {

}
