import { UserCommentEntity } from '@flact/entities';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(UserCommentEntity)
export class UserCommentRepository extends Repository<UserCommentEntity> {

}
