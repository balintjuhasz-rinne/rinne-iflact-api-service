import { CompanyEntity } from '@flact/entities';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(CompanyEntity)
export class CompanyRepository extends Repository<CompanyEntity> {}
