import { UserNotificationEntity } from '@flact/entities';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(UserNotificationEntity)
export class UserNotificationRepository extends Repository<UserNotificationEntity> {

}
