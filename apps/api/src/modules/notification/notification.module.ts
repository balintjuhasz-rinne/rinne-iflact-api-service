import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsModule } from '@pixelplex/sms-service';
import { MessageRepository } from './repositories/message.repository';
import { UserNotificationRepository } from './repositories/user.notification.repository';
import { NotificationService } from './services/notification.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserNotificationRepository,
      MessageRepository,
    ]),
    SmsModule,
  ],
  providers: [
    NotificationService,
  ],
  exports: [
    NotificationService,
  ],
})
export class NotificationModule {}
