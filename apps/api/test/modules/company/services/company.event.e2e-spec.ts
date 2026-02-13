import { AllianceEntity, CompanyEntity } from '@flact/entities';
import { INestApplication } from '@nestjs/common';
import { CLIENT_NAME } from 'config';
import { clearQuery, insertQuery } from '../../../../../../.test/helpers/query.builder.helper';
import { CompanyEventService } from '../../../../src/modules/company/services/company.event.service';
import { initApp } from '../../../app';
import { MAIN_ALLIANCE_ID } from '../../mocks/alliance.data';
import { testCompanies } from './mocks/companies.mock';

describe('CompanyEventService', () => {
  let app: INestApplication;
  let companyEventService;

  beforeAll(async (done) => {
    app = await initApp();
    companyEventService = app.get(CompanyEventService);

    await insertQuery(CompanyEntity, testCompanies);

    done();
  });

  afterAll(async () => {
    await clearQuery(AllianceEntity);

    await app.close();
  });

  describe('sendCompanyCalendarNotifications', () => {
    let sendBeforeIncDateNotification;
    let sendBeforeFinDateNotification;
    let sendBeforeAgmNotification;

    beforeAll(async () => {
      sendBeforeIncDateNotification = jest
        .spyOn(companyEventService, 'sendBeforeIncorporationDateNotification')
        .mockImplementation(() => Promise.resolve());
      sendBeforeFinDateNotification = jest
        .spyOn(companyEventService, 'sendBeforeFinancialYearEndDateNotification')
        .mockImplementation(() => Promise.resolve());
      sendBeforeAgmNotification = jest
        .spyOn(companyEventService, 'sendBeforeAnniversaryOfAgmNotification')
        .mockImplementation(() => Promise.resolve());
    });

    beforeEach(() => {
      sendBeforeIncDateNotification.mockClear();
      sendBeforeFinDateNotification.mockClear();
      sendBeforeAgmNotification.mockClear();
    });

    it('should call all methods with main alliance', async () => {
      await companyEventService.sendCompanyCalendarNotifications();

      const clientCompaniesCount = testCompanies.filter(company => company.allianceId === MAIN_ALLIANCE_ID).length;

      [sendBeforeIncDateNotification, sendBeforeFinDateNotification, sendBeforeAgmNotification]
        .forEach(({ mock }) => {
          expect(mock.calls.length).toEqual(1);
          const alliance = mock.calls[0][0];
          expect(alliance.name).toEqual(CLIENT_NAME);
          expect(alliance.companies.length).toEqual(clientCompaniesCount);
        });

    });
  });
});
