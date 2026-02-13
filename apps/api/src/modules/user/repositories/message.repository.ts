import { UserMessageEntity } from '@flact/entities';
import { EntityRepository, Repository } from 'typeorm';
import { GetUserMessagesQueryDTO } from '../dtos/user.controller.dto';

@EntityRepository(UserMessageEntity)
export class MessageRepository extends Repository<UserMessageEntity> {

  getMessages(userId: number, { startDate, endDate, type, resolutionId }: GetUserMessagesQueryDTO): Promise<UserMessageEntity[]> {
    return this.createQueryBuilder('m')
      .where([
        'm.userId = :userId',
        ...resolutionId ? ['m.context ->> \'resolutionId\' LIKE :resolutionId'] : [],
        ...type ? ['m.type = :type'] : [],
        ...startDate ? ['m.updatedAt >= :startDate'] : [],
        ...endDate ? ['m.updatedAt <= :endDate'] : [],
      ].join(' AND '))
      .setParameters({
        resolutionId: `%${resolutionId}%`,
        userId,
        startDate,
        endDate,
        type,
      })
      .getMany();
  }
}
