import { MESSAGE_DELIVERY, NOTIFICATION_TEMPLATES, NotificationTemplate } from '@flact/constants';
import { UserMessageEntity } from '@flact/entities';
import { IMessageNotification } from '@flact/interfaces';
import { Injectable } from '@nestjs/common';
import { SmsService } from '@pixelplex/sms-service/dist';
import { fillMessageTemplate } from '../../../helpers';
import { RabbitmqEmailService } from '../../rabbitmq/services/rabbitmq.email.service';
import { MessageRepository } from '../repositories/message.repository';
import { UserNotificationRepository } from '../repositories/user.notification.repository';

const {
  INVITE_USER: { template: INVITE_TEMPLATE },
  RESET_PASSWORD: { template: RESET_PASSWORD_TEMPLATE },
} = NOTIFICATION_TEMPLATES;

@Injectable()
export class NotificationService {

  constructor(
    private readonly notificationRepository: UserNotificationRepository,
    private readonly messageRepository: MessageRepository,
    private readonly rabbitmqEmailService: RabbitmqEmailService,
    private readonly smsService: SmsService,
  ) {}

  async sendDirectNotification(userId: number, template: NotificationTemplate, data: IMessageNotification, delivery: MESSAGE_DELIVERY): Promise<void> {
    await this.sendNotification(template, data, userId, delivery);
  }

  async sendEventNotifications(userId: number, template: NotificationTemplate, data: IMessageNotification): Promise<void> {
    const notifications = await this.notificationRepository.find({ where: { userId, enabled: true, event: true } });

    await Promise.all(notifications.map(async ({ delivery }) =>
      this.sendNotification(template, data, userId, delivery),
    ));
  }

  async sendNotification(template: NotificationTemplate, data: IMessageNotification, userId: number, delivery: MESSAGE_DELIVERY) {
    switch (delivery) {
    case MESSAGE_DELIVERY.EMAIL:
      await this.sendEmailNotification(template, data);
      break;
    case MESSAGE_DELIVERY.SMS:
      await this.sendSmsNotification(template, data);
    }
    return this.saveNotificationToMessageHistory(template, data, userId, delivery);
  }

  async saveNotificationToMessageHistory(template: NotificationTemplate, { context }: IMessageNotification, userId: number, delivery: MESSAGE_DELIVERY): Promise<UserMessageEntity> {
    //TODO Disabled for phase 1
    if (delivery === MESSAGE_DELIVERY.SMS) {
      return;
    }
    const saveContext = ![INVITE_TEMPLATE, RESET_PASSWORD_TEMPLATE].includes(template.template);

    const text = fillMessageTemplate(template.text, context);
    const message: Partial<UserMessageEntity> = {
      delivery,
      type: template.type,
      text,
      userId,
      ...(saveContext && { context }),
      ...(saveContext && { template }),
    };
    return this.messageRepository.save(message);
  }

  private async sendEmailNotification({ template, subject }: NotificationTemplate, data: IMessageNotification) {
    await this.rabbitmqEmailService.sendNotificationEvent({ ...data, template, subject });
  }

  private async sendSmsNotification({ template }: NotificationTemplate, { phoneNumber, context }: IMessageNotification) {
    //TODO Disabled for phase 1
    return;
    await this.smsService.sendSms(phoneNumber, template, context, 20);
  }

}
