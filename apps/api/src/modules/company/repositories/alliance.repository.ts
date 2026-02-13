import { AllianceEntity } from '@flact/entities';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(AllianceEntity)
export class AllianceRepository extends Repository<AllianceEntity> {

}
