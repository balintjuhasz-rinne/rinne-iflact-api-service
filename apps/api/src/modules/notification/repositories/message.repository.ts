import { UserMessageEntity } from '@flact/entities';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(UserMessageEntity)
export class MessageRepository extends Repository<UserMessageEntity> {

}
