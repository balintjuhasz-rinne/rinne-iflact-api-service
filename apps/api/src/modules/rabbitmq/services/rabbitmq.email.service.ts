import { mailGeneralClient } from '@flact/connectors';
import { RABBITMQ_CONSTANTS } from '@flact/constants';
import { IMailMessage } from '@flact/interfaces';
import { Injectable } from '@nestjs/common';
import { Client, ClientProxy } from '@nestjs/microservices';

@Injectable()
export class RabbitmqEmailService {
  @Client(mailGeneralClient)
  client: ClientProxy;

  sendNotificationEvent(message: IMailMessage) {
    this.client.emit(RABBITMQ_CONSTANTS.AMQP_MESSAGE_TYPES.EMAIL.NOTIFICATION, message);
  }

}
