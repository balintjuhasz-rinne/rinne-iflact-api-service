import { CompanyEntity } from '@flact/entities';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(CompanyEntity)
export class CompanyRepository extends Repository<CompanyEntity> {

  async findIdsByName(name: string): Promise<number[]> {
    return this.createQueryBuilder('c')
      .where('LOWER(c.name) LIKE LOWER(:name)', { name: `%${name}%` })
      .select(['c.id as id'])
      .getRawMany<number>();
  }
}
