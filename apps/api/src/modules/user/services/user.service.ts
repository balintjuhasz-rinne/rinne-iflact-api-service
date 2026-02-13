import {
  FILE_ERRORS,
  IMAGE_MIME_TYPES,
  MESSAGE_DELIVERY,
  PASSWORD_ERRORS,
  USER_ERRORS,
  USER_LOG_PARAM,
  USER_ROLE,
  USER_STATUS,
} from '@flact/constants';
import { FileEntity, UserEntity, UserLogEntity, UserMessageEntity, UserNotificationEntity } from '@flact/entities';
import { BadRequestError, NotFoundError, UnprocessableEntityError } from '@flact/exceptions';
import { Injectable } from '@nestjs/common';
import { CLIENT_NAME } from 'config';
import { DeepPartial } from 'typeorm/common/DeepPartial';
import { normalizeEmail } from '../../../validators/email.validator';
import { JwtPayload } from '../../auth/dtos/jwt.payload.dto';
import { PasswordService } from '../../auth/services/password.service';
import { FileService } from '../../file/services/file.service';
import { InviteService } from '../../invite/services/invite.service';
import {
  GetUserLogsQueryDTO,
  GetUserMessagesQueryDTO,
  UpdateMeBodyDTO,
  UpdateMyNotificationsBodyDTO,
} from '../dtos/user.controller.dto';
import { AllianceRepository } from '../repositories/alliance.repository';
import { FileRepository } from '../repositories/file.repository';
import { MessageRepository } from '../repositories/message.repository';
import { UserLogRepository } from '../repositories/user.log.repository';
import { UserNotificationRepository } from '../repositories/user.notification.repository';
import { UserRepository } from '../repositories/user.repository';
import { UserLogService } from './user.log.service';
import { WorkplaceService } from './workplace.service';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly fileRepository: FileRepository,
    private readonly messageRepository: MessageRepository,
    private readonly notificationRepository: UserNotificationRepository,
    private readonly logRepository: UserLogRepository,
    private readonly allianceRepository: AllianceRepository,
    private readonly userLogService: UserLogService,
    private readonly inviteService: InviteService,
    private readonly fileService: FileService,
    private readonly passwordService: PasswordService,
    private readonly workplaceService: WorkplaceService,
  ) { }

  private async getAvatarOrFail(id: number): Promise<FileEntity> {
    const avatar = await this.fileRepository.findOne({ where: { id } });
    if (!avatar) {
      throw new UnprocessableEntityError([{ field: 'documentId', message: FILE_ERRORS.FILE_NOT_FOUND }]);
    }
    if (!IMAGE_MIME_TYPES.includes(avatar.type)) {
      throw new BadRequestError([{ field: 'fileId', message: FILE_ERRORS.FILE_INVALID_TYPE }]);
    }
    return avatar;
  }

  private async getUserOrFail(condition: Partial<UserEntity>, relations: string[] = []): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { registrationCompleted: true, ...condition },
      relations,
    });

    if (!user) {
      throw new NotFoundError([{ field: '', message: USER_ERRORS.USER_NOT_FOUND }]);
    }
    return user;
  }

  async getMe(id: number, allianceId: number): Promise<UserEntity> {
    return this.getUserOrFail({ id, allianceId },
      ['workplaces', 'workplaces.company', 'workplaces.company.logo', 'avatar', 'workplaces.positions', 'notifications'],
    );
  }

  async getUserMessages(id: number, filters: GetUserMessagesQueryDTO, allianceId: number): Promise<UserMessageEntity[]> {
    await this.getUserOrFail({ id, allianceId });
    return this.messageRepository.getMessages(id, filters);
  }

  async createUser(userDTO: DeepPartial<UserEntity>, { allianceId, id: cosedId }: JwtPayload): Promise<UserEntity> {
    const normalizedEmail = normalizeEmail(userDTO.email);

    const user = await this.userRepository.findOne({ where: { normalizedEmail, allianceId } });
    if (user && user.status !== USER_STATUS.DELETED) {
      throw new UnprocessableEntityError([{ field: 'email', message: USER_ERRORS.EMAIL_ALREADY_IS_USED }]);
    }

    await this.workplaceService.validateWorkplaces(userDTO.workplaces, allianceId);

    const notifications: Partial<UserNotificationEntity>[] = [
      { delivery: MESSAGE_DELIVERY.EMAIL, enabled: true, event: true },
      { delivery: MESSAGE_DELIVERY.SMS },
    ];

    const userData = this.userRepository.create({
      ...(user && { ...user }),
      ...userDTO,
      normalizedEmail,
      allianceId,
      registrationCompleted: false,
      notifications,
      status: USER_STATUS.ACTIVE,
    });

    const invitedUser = user
      ? await this.restoreDeletedUser(userData)
      : await this.createNewUser(userData);

    await Promise.all([
      this.userLogService.addLog({
        userId: invitedUser.id,
        authorId: cosedId,
        parameter: USER_LOG_PARAM.INVITATION,
        newValue: invitedUser.id.toString(),
      }),
      this.workplaceService.logNewWorkplaces(invitedUser.workplaces, userDTO.role, cosedId),
    ]);

    await this.userLogService.logEntityChanges({ id: invitedUser.id, role: invitedUser.role }, cosedId, userData);

    return invitedUser;
  }

  private async createNewUser(userData: UserEntity): Promise<UserEntity> {
    const invitedUser = await this.userRepository.save(userData);

    try {
      await this.inviteService.inviteUser(invitedUser);
      return invitedUser;
    } catch (error) {
      await this.userRepository.delete({ id: invitedUser.id });
      throw (error);
    }
  }

  private async restoreDeletedUser(userData: UserEntity): Promise<UserEntity> {
    await this.inviteService.inviteUser(userData);
    return await this.userRepository.save(userData);
  }

  async getUserByToken(token: string): Promise<UserEntity> {
    const { id: allianceId } = await this.allianceRepository.findOne({ name: CLIENT_NAME });

    const { email: normalizedEmail } = await this.inviteService.getInvitationByToken(token, allianceId);
    return this.getUserOrFail({ normalizedEmail, registrationCompleted: false, allianceId },
      ['workplaces', 'workplaces.company', 'workplaces.positions'],
    );
  }

  async updateMe({ id, role, allianceId }: JwtPayload, updateData: UpdateMeBodyDTO): Promise<UserEntity> {
    const user = await this.getUserOrFail({ id, allianceId }, ['avatar']);
    let avatar = user.avatar;
    if (updateData.avatarId && user.avatarId !== updateData.avatarId) {
      avatar = await this.getAvatarOrFail(updateData.avatarId);
      await this.fileService.removeFile(user.avatarId);
    }

    if (updateData.avatarId === null) {
      await this.fileService.removeFile(user.avatarId);
    }

    if (updateData.phoneNumber === null) {
      await this.notificationRepository.update({ userId: id, delivery: MESSAGE_DELIVERY.SMS }, { enabled: false });
    }

    if (role === USER_ROLE.CO_SIGNATORY) {
      delete updateData.cosecPosition;
    }

    await this.userLogService.logEntityChanges(user, user.id, { ...updateData, avatar });
    return this.userRepository.save({ id, ...updateData });
  }

  async changePassword(oldPassword: string, newPassword: string, { id, allianceId }: JwtPayload): Promise<void> {
    const user = await this.getUserOrFail({ id, allianceId });
    const isPasswordCorrect = await this.passwordService.comparePasswords(oldPassword, user.password);
    if (!isPasswordCorrect) {
      throw new UnprocessableEntityError([{ field: 'oldPassword', message: PASSWORD_ERRORS.INVALID_PASSWORD }]);
    }

    const passwordHash = await this.passwordService.getHashByPassword(newPassword);
    await this.userLogService.addLog({
      userId: id,
      authorId: id,
      parameter: USER_LOG_PARAM.NEW_PASSWORD,
      oldValue: oldPassword.replace(/./g, '*'),
      newValue: newPassword.replace(/./g, '*'),
    });
    await this.userRepository.update({ id }, { password: passwordHash });
  }

  async updateUserNotifications({ id, allianceId }: JwtPayload, { notifications }: UpdateMyNotificationsBodyDTO) {
    const user = await this.getUserOrFail({ id, allianceId }, ['notifications']);

    if (!user.phoneNumber && notifications.find(({ delivery }) => delivery === MESSAGE_DELIVERY.SMS)?.enabled) {
      throw new UnprocessableEntityError([{ field: '', message: USER_ERRORS.PHONE_NUMBER_REQUIRED }]);
    }

    await Promise.all(notifications.map(notification => {
      this.notificationRepository.update({ userId: id, delivery: notification.delivery }, notification);
    }));

    await this.userLogService.logEntityChanges(user, user.id, { notifications: <UserNotificationEntity[]>notifications });
  }

  async getUserLogs(id: number, logFilters: GetUserLogsQueryDTO, allianceId: number): Promise<UserLogEntity[]> {
    await this.getUserOrFail({ id, allianceId });
    const logs = await this.logRepository.getUserLogs(id, logFilters);

    return Promise.all(logs.map(async (log) => {
      if (log.parameter !== USER_LOG_PARAM.INVITATION) {
        return log;
      }

      const relatedUser = await this.userRepository.findOne({ id: +log.newValue }, {
        relations: ['avatar'],
        select: ['id', 'name', 'surname', 'avatar'],
      });

      return { ...log, relatedUser };
    }));
  }

  async getUserColleagues(id: number, user: JwtPayload): Promise<UserEntity[]> {
    const existingUser = await this.getUserOrFail({ id, allianceId: user.allianceId }, ['workplaces']);
    const companyIds = existingUser.workplaces.map(workplace => workplace.companyId);
    return this.userRepository.findColleagues(existingUser, companyIds);
  }
}
