import { SORT_ORDER, USER_STATUS } from '@flact/constants';
import { UserEntity } from '@flact/entities';
import { EntityRepository, Repository } from 'typeorm';
import { GetCosignatoriesQueryDTO } from '../dtos/cosignatory.controller.dtos';
import { getCosignSortConditions } from '../helpers/user.sort.helper';

@EntityRepository(UserEntity)
export class UserRepository extends Repository<UserEntity> {
  async findCosignatoriesAndCount({ status, companyId, name, sortParam, sortOrder = SORT_ORDER.ASC, skip, limit }: GetCosignatoriesQueryDTO, allianceId: number): Promise<[UserEntity[], number]> {
    const query = this.createQueryBuilder('u');

    const sortConditions = getCosignSortConditions(sortParam, sortOrder);

    if (companyId) {
      query.innerJoin('u.workplaces', 'w', `${companyId ? 'w.companyId = :companyId' : ''}`);
    }

    sortConditions.map((condition) => query.addOrderBy(condition.param, condition.sortOrder, 'NULLS LAST'));

    return query.leftJoinAndSelect('u.avatar', 'a')
      .leftJoinAndSelect('u.summary', 's')
      .leftJoinAndSelect('s.firstCompany', 'c')
      .where([
        ...status ? ['u.status = :status'] : ['u.status != \'DELETED\''],
        'u.registrationCompleted = true',
        'u.role = \'CO_SIGNATORY\'',
        'u.allianceId = :allianceId',
        ...name ? ['LOWER(u.name || \' \' || coalesce(u.surname, \'\')) LIKE LOWER(:name)'] : [],
      ].join(' AND '))
      .setParameters({
        allianceId,
        companyId,
        status,
        name: `%${name}%`,
      })
      .skip(skip)
      .take(limit)
      .getManyAndCount();
  }

  async findColleagues(user: UserEntity, companyIds: number[]): Promise<UserEntity[]> {
    return this.createQueryBuilder('u')
      .innerJoinAndSelect('u.workplaces', 'w', 'w.companyId IN (:...companyIds)', { companyIds })
      .leftJoinAndSelect('u.avatar', 'a')
      .leftJoinAndSelect('w.positions', 'p')
      .where('u.allianceId = :allianceId', { allianceId: user.allianceId })
      .andWhere('u.id != :userId', { userId: user.id })
      .andWhere('u.role = :role', { role: user.role })
      .andWhere('status = :status', { status: USER_STATUS.ACTIVE })
      .andWhere('u.registrationCompleted = true')
      .getMany();
  }
}
