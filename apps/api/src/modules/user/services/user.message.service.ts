import { MESSAGE_TYPE, NotificationTemplate, USER_MESSAGE_ERRORS } from '@flact/constants';
import { UserMessageEntity } from '@flact/entities';
import { NotFoundError, UnprocessableEntityError } from '@flact/exceptions';
import { IMessageNotification } from '@flact/interfaces';
import { Injectable, Logger } from '@nestjs/common';
import { NotificationService } from '../../notification/services/notification.service';
import { UrlShortenerService } from '../../url-shortener/services/url.shortener.service';
import { MessageRepository } from '../repositories/message.repository';

@Injectable()
export class UserMessageService {
  private readonly logger: Logger = new Logger(UserMessageService.name);

  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly urlShortenerService: UrlShortenerService,
    private readonly notificationService: NotificationService,
  ) {}

  private async getUserMessageOrFail(condition: Partial<UserMessageEntity>, relations: string[] = []): Promise<UserMessageEntity> {
    const message = await this.messageRepository.findOne({
      where: condition,
      relations,
    });

    if (!message) {
      throw new NotFoundError([{ field: '', message: USER_MESSAGE_ERRORS.USER_MESSAGE_NOT_FOUND }]);
    }
    return message;
  }

  async resendUserMessage(userId: number, messageId: number): Promise<UserMessageEntity> {
    this.logger.debug(`resend notification ${messageId} to user ${userId}`);
    const message = await this.getUserMessageOrFail({ id: messageId, userId }, ['user', 'user.notifications']);

    if (message.type === MESSAGE_TYPE.REMINDER) {
      throw new UnprocessableEntityError([{ field: '', message: USER_MESSAGE_ERRORS.USER_NOTIFICATION_CAN_NOT_BE_RESEND }]);
    }

    const notificationSettings = message.user.notifications.find(({ delivery }) => delivery === message.delivery);
    if (!notificationSettings?.enabled || !notificationSettings?.event) {
      throw new UnprocessableEntityError([{ field: '', message: USER_MESSAGE_ERRORS.USER_DISABLE_NOTIFICATIONS }]);
    }

    const { template, notification } = await this.parseUserMessage(message);
    const { context, isLinkUpdated } = await this.updateMessageContextLink(notification.context, template.type);
    notification.context = context;

    await this.notificationService.sendNotification(template, notification, userId, message.delivery);
    return this.saveResendedMessageToDb(template, notification, message, isLinkUpdated);
  }

  private async saveResendedMessageToDb(template, notification, { userId, delivery, id }: Partial<UserMessageEntity>, isLinkUpdated: boolean) {
    return isLinkUpdated
      ? this.notificationService.saveNotificationToMessageHistory(template, notification, userId, delivery)
      : this.messageRepository.save({ id, updatedAt: new Date() });
  }

  private parseUserMessage(message: UserMessageEntity) {
    const { email, phoneNumber } = message.user;
    const context: Record<string, any> = message.context;
    const template: NotificationTemplate = message.template;

    const notification: IMessageNotification = { email, phoneNumber, context };

    return { notification, template };
  }

  private async updateMessageContextLink(context: Record<string, any>, messageType: MESSAGE_TYPE) {
    let isLinkUpdated = false;
    let link;

    if (context.longLink) {
      link = await this.urlShortenerService.shortenUrl(context.longLink, messageType);
    }

    if (link !== context.link) {
      isLinkUpdated = true;
      this.logger.debug(`link updated from '${context.link}' to '${link}'`);
    }
    return { context: { ...context, link }, isLinkUpdated };
  }

}
