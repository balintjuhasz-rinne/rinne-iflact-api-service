import { USER_ROLE } from '@flact/constants';
import { AllianceEntity, InviteEntity } from '@flact/entities';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { CLIENT_NAME } from 'config';
import request from 'supertest';
import { Not } from 'typeorm';
import { clearQuery } from '../../../../../../.test/helpers/query.builder.helper';
import { AllianceRepository } from '../../../../src/modules/admin/repositories/alliance.repository';
import { CompanyRepository } from '../../../../src/modules/admin/repositories/company.repository';
import { UserRepository } from '../../../../src/modules/admin/repositories/user.repository';
import { MigrateService } from '../../../../src/modules/admin/services/migrate.service';
import { MigrateCompanyData, MigrateUserData } from '../../../../src/modules/admin/types/migrate.types';
import { NotificationService } from '../../../../src/modules/notification/services/notification.service';
import { RabbitmqBlockchainService } from '../../../../src/modules/rabbitmq/services/rabbitmq.blockchain.service';
import { initApp } from '../../../app';
import companiesJson from './mocks/migrate.data.companies.json';
import usersJson from './mocks/migrate.data.users.json';

const migrationFilePath = `${__dirname}/mocks/Migration_template.xlsx`;

const MIGRATION_COMPANIES_COUNT = 5;
const MIGRATION_USERS_COUNT = 7;

describe('AdminController', () => {
  let app: INestApplication;
  let allianceRepository: AllianceRepository;
  let companyRepository: CompanyRepository;
  let userRepository: UserRepository;
  let blockchainService: RabbitmqBlockchainService;
  let notificationService: NotificationService;
  let migrateService: MigrateService;

  const companiesMock: MigrateCompanyData[] = companiesJson.map(company => ({
    ...company,
    incorporationDate: new Date(company.incorporationDate),
    financialYearEndDate: new Date(company.financialYearEndDate),
  })) as MigrateCompanyData[];

  const usersMock: MigrateUserData[] = usersJson as MigrateUserData[];

  beforeAll(async (done) => {
    app = await initApp(false);
    allianceRepository = app.get(AllianceRepository);
    companyRepository = app.get(CompanyRepository);
    userRepository = app.get(UserRepository);
    blockchainService = app.get(RabbitmqBlockchainService);
    notificationService = app.get(NotificationService);
    migrateService = app.get(MigrateService);

    done();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('migrateData', () => {
    let registerCompanySpy;
    let sendDirectNotificationSpy;
    let parseDataSpy;

    beforeAll(async() => {
      await clearQuery(AllianceEntity);

      registerCompanySpy = jest.spyOn(blockchainService, 'sendRegisterCompanyEvent').mockImplementation(() => Promise.resolve());
      sendDirectNotificationSpy = jest.spyOn(notificationService, 'sendDirectNotification').mockImplementation(() => Promise.resolve());
      parseDataSpy = jest
        .spyOn(migrateService, 'parseData')
        .mockImplementation(() => [usersMock, companiesMock]);
    });

    afterEach(async (done) => {
      registerCompanySpy.mockReset();
      sendDirectNotificationSpy.mockReset();
      parseDataSpy.mockReset();

      await clearQuery(AllianceEntity);
      await clearQuery(InviteEntity);
      done();
    });

    describe('success', () => {
      it('should migrate data', async () => {
        const [alliance, companies, users] = await Promise.all([
          allianceRepository.findOne({ where: { name: CLIENT_NAME } }),
          companyRepository.find(),
          userRepository.find({ role: Not(USER_ROLE.ADMIN) }),
        ]);

        expect(alliance).not.toBeDefined();
        expect(companies.length).toEqual(0);
        expect(users.length).toEqual(0);

        return request(app.getHttpServer())
          .post('/api/v1/admin/migrate/pixel-admin')
          .attach('file', migrationFilePath)
          .set({ role: USER_ROLE.ADMIN })
          .expect(HttpStatus.CREATED)
          .then(async () => {
            const [alliance, companies, users] = await Promise.all([
              allianceRepository.findOne({ where: { name: CLIENT_NAME } }),
              companyRepository.find(),
              userRepository.find({ where: { role: Not(USER_ROLE.ADMIN) }, relations: ['workplaces'] }),
            ]);

            expect(alliance).toBeDefined();
            expect(companies.length).toEqual(MIGRATION_COMPANIES_COUNT);
            expect(users.length).toEqual(MIGRATION_USERS_COUNT);

            users.forEach((user) => {
              expect(user.workplaces.length).toBeGreaterThan(0);
            });
          });
      }, 10000);
    });

  });
});
