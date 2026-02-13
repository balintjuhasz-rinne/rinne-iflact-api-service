import { SORT_ORDER, USER_ROLE } from '@flact/constants';
import { CompanyEntity } from '@flact/entities';
import { EntityRepository, Repository } from 'typeorm';
import { JwtPayload } from '../../auth/dtos/jwt.payload.dto';
import { GetCompaniesQueryDTO } from '../dtos/company.controller.dtos';

@EntityRepository(CompanyEntity)
export class CompanyRepository extends Repository<CompanyEntity> {

  async getCompaniesNames(user: JwtPayload): Promise<CompanyEntity[]> {
    const selectQuery = this.createQueryBuilder('c').select(['c.id as id, c.name as name']);

    if (user.role === USER_ROLE.CO_SIGNATORY) {
      selectQuery.innerJoin('c.workplaces', 'w', 'w.userId = :userId', { userId: user.id });
    }

    return selectQuery.getRawMany<CompanyEntity>();
  }

  async findCompaniesAndCount(filters: GetCompaniesQueryDTO, allianceId: number): Promise<[CompanyEntity[], number]> {
    const query = this.createQueryBuilder('c')
      .leftJoinAndSelect('c.logo', 'l')
      .leftJoinAndSelect('c.workplaces', 'w')
      .leftJoinAndSelect('w.user', 'u', 'u.registrationCompleted = true AND u.status = \'ACTIVE\'')
      .leftJoinAndSelect('u.avatar', 'a')
      .where([
        'c.allianceId = :allianceId',
        ...filters.name ? ['LOWER(c.name) LIKE LOWER(:name)'] : [],
      ].join(' AND '))
      .setParameters({
        name: `%${filters.name}%`,
        allianceId,
      })
      .skip(filters.skip)
      .take(filters.limit);

    if (filters.sortParam) {
      query.addOrderBy(`c.${filters.sortParam}`, filters.sortOrder);
    } else {
      query.addOrderBy('c.name', SORT_ORDER.ASC);
    }

    const [companies, count] = await query.getManyAndCount();

    companies.forEach(company => {
      company.workplaces = company.workplaces.filter(workplace => workplace.user);
    });

    return [companies, count];
  }
}
