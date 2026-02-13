import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CompanyModule } from '../company/company.module';
import { FileModule } from '../file/file.module';
import { InviteModule } from '../invite/invite.module';
import { CosecretaryController } from './controllers/cosecretary.controller';
import { CosignatoryController } from './controllers/cosignatory.controller';
import { UserController } from './controllers/user.controller';
import { AllianceRepository } from './repositories/alliance.repository';
import { CompanyRepository } from './repositories/company.repository';
import { FileRepository } from './repositories/file.repository';
import { MessageRepository } from './repositories/message.repository';
import { UserCommentRepository } from './repositories/user.comment.repository';
import { UserLogRepository } from './repositories/user.log.repository';
import { UserNotificationRepository } from './repositories/user.notification.repository';
import { UserPositionRepository } from './repositories/user.position.repository';
import { UserRepository } from './repositories/user.repository';
import { UserWorkplaceRepository } from './repositories/user.workplace.repository';
import { CosignatoryService } from './services/cosignatory.service';
import { UserLogService } from './services/user.log.service';
import { UserMessageService } from './services/user.message.service';
import { UserService } from './services/user.service';
import { WorkplaceService } from './services/workplace.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserRepository,
      AllianceRepository,
      CompanyRepository,
      FileRepository,
      MessageRepository,
      UserNotificationRepository,
      UserPositionRepository,
      UserCommentRepository,
      UserLogRepository,
      UserWorkplaceRepository,
    ]),
    AuthModule,
    InviteModule,
    FileModule,
    forwardRef(() => CompanyModule),
  ],
  providers: [
    UserService,
    UserLogService,
    CosignatoryService,
    UserMessageService,
    WorkplaceService,
  ],
  controllers: [
    UserController,
    CosignatoryController,
    CosecretaryController,
  ],
  exports: [
    UserService,
    UserLogService,
    CosignatoryService,
    WorkplaceService,
  ],
})
export class UserModule {}
