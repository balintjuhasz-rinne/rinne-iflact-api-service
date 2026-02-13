import { RABBITMQ_CONSTANTS } from '@flact/constants';
import { ResolutionStatusChangedDTO } from '@flact/dtos';
import { sentryService } from '@flact/exceptions';
import { timePassedAfterReject } from '@flact/helpers';
import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { ResolutionService } from '../services/resolution.service';

@Controller()
export class ResolutionEventController {
  private logger = new Logger(ResolutionEventController.name);

  constructor(
    private readonly resolutionService: ResolutionService,
  ) {}

  @EventPattern(RABBITMQ_CONSTANTS.AMQP_MESSAGE_TYPES.API.RESOLUTION_STATUS_CHANGED)
  async handleResolutionStatusChanged(@Payload() { id, status }: ResolutionStatusChangedDTO, @Ctx() rmqContext: RmqContext) {
    const channel = rmqContext.getChannelRef();
    const originalMsg = rmqContext.getMessage();

    try {
      await Promise.all([
        this.resolutionService.sendResolutionStatusNotifications(id, status),
        this.resolutionService.saveSystemResolutionActivity(id, status),
      ]);
      channel.ack(originalMsg);
    } catch (e) {
      if (timePassedAfterReject(originalMsg, 'minutes') > 2) {
        this.logger.warn(`send notifications for resolutionId "${id}" with status "${status}" message was market as processed due to exceeding ttl`);
        channel.ack(originalMsg);
        return;
      }
      sentryService.error(e);
      this.logger.error(`sending notifications for resolutionId "${id}" with status "${status}" threw an exception:`, e);
      channel.nack(originalMsg, false, false);
    }
  }

}

