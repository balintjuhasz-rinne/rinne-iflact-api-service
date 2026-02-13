import { CompanyLogEntity } from '@flact/entities';
import { EntityRepository, Repository } from 'typeorm';
import { GetCompanyLogsQueryDTO } from '../dtos/company.controller.dtos';

@EntityRepository(CompanyLogEntity)
export class CompanyLogRepository extends Repository<CompanyLogEntity> {

  async getCompanyLogs(companyId: number, { name, startDate, endDate }: GetCompanyLogsQueryDTO): Promise<CompanyLogEntity[]> {
    return this.createQueryBuilder('l')
      .leftJoinAndSelect('l.author', 'a')
      .leftJoinAndSelect('a.avatar', 'av')
      .where([
        ...name ? ['LOWER(a.name) LIKE LOWER(:name)'] : [],
        ...startDate ? ['l.createdAt >= :startDate'] : [],
        ...endDate ? ['l.createdAt <= :endDate'] : [],
        'l.companyId = :companyId',
      ].join(' AND '))
      .setParameters({
        name: `%${name}%`,
        startDate,
        endDate,
        companyId,
      })
      .getMany();
  }
}
