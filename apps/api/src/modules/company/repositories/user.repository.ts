import { USER_POSITION, USER_ROLE, USER_STATUS } from '@flact/constants';
import { UserEntity } from '@flact/entities';
import { EntityRepository, Repository } from 'typeorm';

class NotificationFilters {
  beforeIncorporation?: boolean;
  beforeFinancialYearEnd?: boolean;
  beforeAnniversaryOfLastAgm?: boolean;
  role?: USER_ROLE;
  position?: USER_POSITION;
  allianceId: number;
}

@EntityRepository(UserEntity)
export class UserRepository extends Repository<UserEntity> {
  async getUsersWithEnabledNotifications({
    beforeIncorporation,
    beforeFinancialYearEnd,
    beforeAnniversaryOfLastAgm,
    role,
    position,
    allianceId,
  }: NotificationFilters): Promise<UserEntity[]> {
    return this.createQueryBuilder('u')
      .leftJoinAndSelect('u.notifications', 'un')
      .leftJoinAndSelect('u.workplaces', 'w')
      .leftJoinAndSelect('w.positions', 'p')
      .leftJoinAndSelect('w.company', 'c')
      .where([
        'u.allianceId = :allianceId',
        'u.registrationCompleted = true',
        'u.status = :status',
        'un.enabled = true',
        ...role ? ['u.role = :role'] : [],
        ...position ? ['(p.name = :position OR p.name IS NULL)'] : [],
        ...beforeIncorporation ? ['un.beforeIncorporation > 0'] : [],
        ...beforeFinancialYearEnd ? ['un.beforeFinancialYearEnd > 0'] : [],
        ...beforeAnniversaryOfLastAgm ? ['un.beforeAnniversaryOfLastAgm > 0'] : [],
      ].join(' AND '))
      .setParameters({
        status: USER_STATUS.ACTIVE,
        role,
        position,
        beforeIncorporation,
        beforeFinancialYearEnd,
        beforeAnniversaryOfLastAgm,
        allianceId,
      })
      .getMany();
  }

  async getCompanyUsers(companyId: number, { role }: Partial<UserEntity>): Promise<UserEntity[]> {
    return this.createQueryBuilder('u')
      .leftJoinAndSelect('u.avatar', 'a')
      .innerJoinAndSelect('u.workplaces', 'w', 'w.companyId = :companyId', { companyId })
      .leftJoinAndSelect('w.positions', 'p')
      .where([
        'u.status = :status',
        ...role ? ['u.role = :role'] : [],
      ].join(' AND '))
      .setParameters({
        status: USER_STATUS.ACTIVE,
        role,
      })
      .orderBy('u.id', 'ASC')
      .getMany();
  }
}
