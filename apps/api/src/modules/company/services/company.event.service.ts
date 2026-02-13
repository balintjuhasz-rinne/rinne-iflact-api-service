import {
  BEFORE_AGM_MONTHS,
  MESSAGE_DELIVERY,
  NOTIFICATION_TEMPLATES,
  NotificationTemplate,
  USER_POSITION,
  USER_ROLE,
} from '@flact/constants';
import { AllianceEntity, UserEntity } from '@flact/entities';
import { IMessageCalendarCompanyEvent } from '@flact/interfaces';
import { Injectable, Logger } from '@nestjs/common';
import { CLIENT_NAME } from 'config';
import moment from 'moment';
import { getDaysBefore } from '../../../helpers';
import { NotificationService } from '../../notification/services/notification.service';
import { AllianceRepository } from '../repositories/alliance.repository';
import { CompanyRepository } from '../repositories/company.repository';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class CompanyEventService {
  private logger = new Logger(CompanyEventService.name);

  constructor(
    private readonly allianceRepository: AllianceRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly userRepository: UserRepository,
    private readonly notificationService: NotificationService,
  ) {
  }

  async sendCompanyCalendarNotifications(): Promise<void> {
    const alliance = await this.allianceRepository.findOne({ where: { name: CLIENT_NAME }, relations: ['companies'] });

    if (!alliance) {
      return;
    }

    await Promise.all([
      this.sendBeforeIncorporationDateNotification(alliance),
      this.sendBeforeFinancialYearEndDateNotification(alliance),
      this.sendBeforeAnniversaryOfAgmNotification(alliance),
    ]);
  }

  private async sendBeforeIncorporationDateNotification(alliance: AllianceEntity): Promise<void> {
    this.logger.debug('send before incorporation date notifications');

    const users = await this.userRepository.getUsersWithEnabledNotifications({
      role: USER_ROLE.CO_SECRETARY,
      beforeIncorporation: true,
      allianceId: alliance.id,
    });

    await Promise.all(users.map((user) => {
      return Promise.all(user.notifications.map(async ({ delivery, beforeIncorporation }) => {
        return Promise.all(alliance.companies.map((company) => {
          if (getDaysBefore(company.incorporationDate, true) === beforeIncorporation) {
            return this.sendCalendarNotification(user, company.name, beforeIncorporation, NOTIFICATION_TEMPLATES.INCORPORATION_DATE, delivery);
          }
        }));
      }));
    }));
  }

  private async sendBeforeFinancialYearEndDateNotification(alliance: AllianceEntity): Promise<void> {
    this.logger.debug('send before financial year date notifications');

    const users = await this.userRepository.getUsersWithEnabledNotifications({
      beforeFinancialYearEnd: true,
      position: USER_POSITION.DIRECTOR,
      allianceId: alliance.id,
    });

    await Promise.all(users.map((user) => {
      return Promise.all(user.notifications.map(({ delivery, beforeFinancialYearEnd }) => {
        const companies = user.role === USER_ROLE.CO_SECRETARY
          ? alliance.companies
          : user.workplaces.map(workplace => workplace.company);
        return Promise.all(companies.map((company) => {
          if (getDaysBefore(company.financialYearEndDate, true) === beforeFinancialYearEnd) {
            const notificationTemplate = user.role === USER_ROLE.CO_SECRETARY
              ? NOTIFICATION_TEMPLATES.FINANCIAL_YEAR_END_DATE_COSEC
              : NOTIFICATION_TEMPLATES.FINANCIAL_YEAR_END_DATE_COSIGN;

            this.sendCalendarNotification(user, company.name, beforeFinancialYearEnd, notificationTemplate, delivery);
          }
        }));
      }));
    }));
  }

  private async sendBeforeAnniversaryOfAgmNotification(alliance: AllianceEntity): Promise<void> {
    this.logger.debug('send before anniversary of agm notifications');

    const users = await this.userRepository.getUsersWithEnabledNotifications({
      role: USER_ROLE.CO_SECRETARY,
      beforeAnniversaryOfLastAgm: true,
      allianceId: alliance.id,
    });

    await Promise.all(users.map((user) => {
      return Promise.all(user.notifications.map(({ delivery, beforeAnniversaryOfLastAgm }) => {
        return Promise.all(alliance.companies.map((company) => {
          if (getDaysBefore(moment(company.nextMeetingDate).add(BEFORE_AGM_MONTHS, 'months')) === beforeAnniversaryOfLastAgm) {
            this.sendCalendarNotification(user, company.name, beforeAnniversaryOfLastAgm, NOTIFICATION_TEMPLATES.ANNIVERSARY_OF_LAST_AGM_DATE, delivery);
          }
        }));
      }));
    }));
  }

  private async sendCalendarNotification(user: UserEntity, companyName: string, daysCount: number, message: NotificationTemplate, delivery: MESSAGE_DELIVERY) {
    this.logger.debug(`send calendar notification { user: ${user.id}, company: ${companyName}, daysCount: ${daysCount}, delivery: ${delivery}, template: ${message.template} }`);

    const { id: userId, email, phoneNumber } = user;

    const content: IMessageCalendarCompanyEvent = {
      email,
      phoneNumber,
      context: {
        company: companyName,
        daysCount,
      },
    };
    await this.notificationService.sendDirectNotification(userId, message, content, delivery);
  }
}
