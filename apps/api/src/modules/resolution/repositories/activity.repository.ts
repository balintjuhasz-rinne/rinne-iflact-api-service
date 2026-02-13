import { ActivityEntity } from '@flact/entities';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(ActivityEntity)
export class ActivityRepository extends Repository<ActivityEntity> {}
