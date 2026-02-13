import { ExceptionsModule } from '@flact/exceptions';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import ormconfig from '../../../ormconfig';
import { RmqConnector } from './connectors/rmq.connector';
import { HealthController } from './health/health.controller';
import { ActivityModule } from './modules/activity/activity.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompanyModule } from './modules/company/company.module';
import { FileModule } from './modules/file/file.module';
import { InviteModule } from './modules/invite/invite.module';
import { NotificationModule } from './modules/notification/notification.module';
import { RabbitmqModule } from './modules/rabbitmq/rabbitmq.module';
import { ResolutionModule } from './modules/resolution/resolution.module';
import { TemplateModule } from './modules/template/template.module';
import { UrlShortenerModule } from './modules/url-shortener/url.shortener.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    TerminusModule,
    TypeOrmModule.forRoot({
      ...ormconfig,
      migrationsRun: true,
    }),
    RmqConnector,
    ExceptionsModule.forRoot({ serverName: 'API' }),
    AuthModule,
    UserModule,
    AdminModule,
    CompanyModule,
    ActivityModule,
    ResolutionModule,
    InviteModule,
    FileModule,
    RabbitmqModule,
    NotificationModule,
    UrlShortenerModule,
    TemplateModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
