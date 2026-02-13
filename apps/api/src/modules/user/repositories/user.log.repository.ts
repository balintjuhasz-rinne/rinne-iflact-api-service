import { UserLogEntity } from '@flact/entities';
import { EntityRepository, Repository } from 'typeorm';
import { GetUserLogsQueryDTO } from '../dtos/user.controller.dto';

@EntityRepository(UserLogEntity)
export class UserLogRepository extends Repository<UserLogEntity> {
  async getUserLogs(userId: number, { name, startDate, endDate }: GetUserLogsQueryDTO): Promise<UserLogEntity[]> {
    return this.createQueryBuilder('l')
      .leftJoinAndSelect('l.author', 'a')
      .leftJoinAndSelect('a.avatar', 'av')
      .leftJoinAndSelect('l.company', 'c')
      .where([
        ...name ? ['(LOWER(a.name) LIKE LOWER(:name) OR LOWER(a.surname) LIKE(:name))'] : [],
        ...startDate ? ['l.createdAt >= :startDate'] : [],
        ...endDate ? ['l.createdAt <= :endDate'] : [],
        'l.userId = :userId',
      ].join(' AND '))
      .setParameters({
        name: `%${name}%`,
        startDate,
        endDate,
        userId,
      })
      .getMany();
  }
}
