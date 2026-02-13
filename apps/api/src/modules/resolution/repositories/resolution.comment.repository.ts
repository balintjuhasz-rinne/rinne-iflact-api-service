import { ResolutionCommentEntity } from '@flact/entities';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(ResolutionCommentEntity)
export class ResolutionCommentRepository extends Repository<ResolutionCommentEntity> {}
