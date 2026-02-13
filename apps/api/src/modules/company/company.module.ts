import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileModule } from '../file/file.module';
import { UserModule } from '../user/user.module';
import { CompanyController } from './controllers/company.controller';
import { CompanyEventController } from './controllers/company.event.controller';
import { AllianceRepository } from './repositories/alliance.repository';
import { CompanyLogRepository } from './repositories/company.log.repository';
import { CompanyRepository } from './repositories/company.repository';
import { FileRepository } from './repositories/file.repository';
import { UserRepository } from './repositories/user.repository';
import { UserWorkplaceRepository } from './repositories/user.workplace.repository';
import { CompanyEventService } from './services/company.event.service';
import { CompanyLogService } from './services/company.log.service';
import { CompanyService } from './services/company.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AllianceRepository,
      CompanyRepository,
      FileRepository,
      UserRepository,
      UserWorkplaceRepository,
      CompanyLogRepository,
    ]),
    FileModule,
    UserModule,
  ],
  providers: [
    CompanyLogService,
    CompanyService,
    CompanyEventService,
  ],
  controllers: [
    CompanyController,
    CompanyEventController,
  ],
  exports: [
    CompanyLogService,
    CompanyService,
  ],
})
export class CompanyModule {}
