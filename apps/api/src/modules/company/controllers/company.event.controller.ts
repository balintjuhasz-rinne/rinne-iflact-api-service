import { RABBITMQ_CONSTANTS } from '@flact/constants';
import { sentryService } from '@flact/exceptions';
import { timePassedAfterReject } from '@flact/helpers';
import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, RmqContext } from '@nestjs/microservices';
import { CompanyEventService } from '../services/company.event.service';

@Controller()
export class CompanyEventController {
  private logger = new Logger(CompanyEventController.name);

  constructor(
    private readonly companyEventService: CompanyEventService,
  ) {}

  @EventPattern(RABBITMQ_CONSTANTS.AMQP_MESSAGE_TYPES.API.COMPANY_CALENDAR_NOTIFICATION)
  async sendCompanyCalendarNotifications(@Ctx() rmqContext: RmqContext) {
    const channel = rmqContext.getChannelRef();
    const originalMsg = rmqContext.getMessage();

    try {
      await this.companyEventService.sendCompanyCalendarNotifications();
      channel.ack(originalMsg);
    } catch (e) {
      if (timePassedAfterReject(originalMsg, 'minutes') > 2) {
        this.logger.warn('send company calendar notifications message was market as processed due to exceeding ttl');
        channel.ack(originalMsg);
        return;
      }
      sentryService.error(e);
      this.logger.error('sending company calendar notifications threw an exception:', e);
      channel.nack(originalMsg, false, false);
    }
  }

}
