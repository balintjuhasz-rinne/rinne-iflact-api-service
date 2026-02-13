import { COSEC_LOG_PARAM, COSIGN_LOG_PARAM, MESSAGE_DELIVERY, USER_LOG_PARAM, USER_ROLE } from '@flact/constants';
import { UserEntity, UserLogEntity, UserWorkplaceEntity } from '@flact/entities';
import { Injectable } from '@nestjs/common';
import _ from 'lodash';
import { DeepPartial } from 'typeorm/common/DeepPartial';
import { UserLogRepository } from '../repositories/user.log.repository';

@Injectable()
export class UserLogService {

  constructor(
    private readonly logRepository: UserLogRepository,
  ) {}

  async logEntityChanges(user: DeepPartial<UserEntity>, authorId: number, newValues: DeepPartial<UserEntity>): Promise<void> {
    const { workplaces: newWorkplaces = [], ...expandedNewValues } = this.expandValues(newValues);
    const { workplaces: oldWorkplaces = [], ...expandedOldValues } = this.expandValues(user);

    const roleParams = user.role === USER_ROLE.CO_SECRETARY ? COSEC_LOG_PARAM : COSIGN_LOG_PARAM;
    const logParams = Object.values({ ...USER_LOG_PARAM, ...roleParams });

    const values = _.omitBy(expandedNewValues, (v, k) => expandedOldValues[k] === v || !logParams.includes(k));

    const logs: DeepPartial<UserLogEntity[]> = Object.entries(values).map(([parameter, newValue]) => ({
      userId: user.id,
      authorId,
      parameter,
      oldValue: expandedOldValues[parameter],
      newValue,
    }));

    if (user.role === USER_ROLE.CO_SIGNATORY) {
      await this.addWorkplacesLogs(oldWorkplaces, newWorkplaces, authorId);
    }
    await this.addLogs(logs);
  }

  async addWorkplacesLogs(oldWorkplaces: UserWorkplaceEntity[], newWorkplaces: UserWorkplaceEntity[], authorId: number) {
    await Promise.all(newWorkplaces.map(workplace => {
      const oldWorkplace = oldWorkplaces.find(({ companyId }) => companyId === workplace.companyId) || {};
      const expandedNewValues = this.expandWorkplaceValue(workplace);
      const expandedOldValues = this.expandWorkplaceValue(oldWorkplace);

      const values = _.omitBy(expandedNewValues, (v, k) => expandedOldValues[k] === v || !(<any>Object).values(COSIGN_LOG_PARAM).includes(k));

      const logs: DeepPartial<UserLogEntity[]> = Object.entries(values).map(([parameter, newValue]) => ({
        userId: workplace.userId,
        authorId,
        parameter,
        oldValue: expandedOldValues[parameter],
        newValue,
        companyId: workplace.companyId,
      }));

      return this.addLogs(logs);
    }));
  }

  async addLogs(logs: DeepPartial<UserLogEntity[]>): Promise<UserLogEntity[]> {
    return this.logRepository.save(logs);
  }

  async addLog(log: DeepPartial<UserLogEntity>): Promise<UserLogEntity> {
    return this.logRepository.save(log);
  }

  private expandWorkplaceValue(workplace: DeepPartial<UserWorkplaceEntity>): Record<string, any> {
    return {
      ...workplace,
      ...(workplace?.positions?.length > 0 && { position: workplace.positions.map(({ name }) => name).sort().join(', ') }),
    };
  }

  private expandValues(user: DeepPartial<UserEntity>): Record<string, any> {
    const notifications = user.notifications?.reduce((notificationValues, notification) => {
      return (notification.delivery === MESSAGE_DELIVERY.EMAIL)
        ? { ...notificationValues, emailNotification: notification.enabled }
        : { ...notificationValues, smsNotification: notification.enabled };
    }, {});

    return {
      ...user,
      ...(user.avatarId && { avatarName: user.avatar?.originalName }),
      ...(user.avatarId === null && { avatarName: null }),
      ...(user.comment && { comment: user.comment.text }),
      ...(notifications && notifications),
    };
  }
}
