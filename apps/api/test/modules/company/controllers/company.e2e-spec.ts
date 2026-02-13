import {
  COMPANY_ERRORS,
  COMPANY_LOG_PARAM,
  COMPANY_SORT_PARAM,
  COMPANY_STATUS,
  FILE_ERRORS,
  FORBIDDEN_ERROR,
  SORT_ORDER,
  USER_ROLE,
  USER_STATUS,
} from '@flact/constants';
import {
  AllianceEntity,
  CompanyEntity,
  CompanyLogEntity,
  FileEntity,
  UserEntity,
  UserPositionEntity,
  UserWorkplaceEntity,
} from '@flact/entities';
import { HttpStatus, INestApplication } from '@nestjs/common';
import moment from 'moment';
import request from 'supertest';
import validator from 'validator';
import {
  clearQuery,
  getManyQuery,
  insertQuery,
  removeByIdsQuery,
} from '../../../../../../.test/helpers/query.builder.helper';
import {
  CreateCompanyBodyDTO,
  CreateCompanyResponseDTO,
  DeleteCompanyResponseDTO,
  GetCompaniesResponseDTO,
  GetCompanyResponseDTO,
  GetCompanyUsersResponseDTO,
  UpdateCompanyBodyDTO,
  UpdateCompanyResponseDTO,
} from '../../../../src/modules/company/dtos/company.controller.dtos';
import { CompanyRepository } from '../../../../src/modules/company/repositories/company.repository';
import { FileService } from '../../../../src/modules/file/services/file.service';
import { RabbitmqBlockchainService } from '../../../../src/modules/rabbitmq/services/rabbitmq.blockchain.service';
import { UserPositionRepository } from '../../../../src/modules/user/repositories/user.position.repository';
import { UserWorkplaceRepository } from '../../../../src/modules/user/repositories/user.workplace.repository';
import { CosignatoryService } from '../../../../src/modules/user/services/cosignatory.service';
import { initApp } from '../../../app';
import { MAIN_ALLIANCE_ID, OTHER_ALLIANCE_ID } from '../../mocks/alliance.data';
import {
  baseCosignWorkplace,
  companyUsers,
  cosignatoryCompanyId,
  createCompanyBody,
  createCompanyResponse,
  deleteCompanyResponse,
  deleteCompanyUsers,
  deleteCompanyUsersPositions,
  deleteCompanyWorkplaces,
  getCompaniesActiveUser,
  getCompaniesInactiveUser,
  getCompaniesResponse,
  getCompaniesWorkplaces,
  getCompanyResponse,
  getCompanyUsersForCosecResponse,
  newLogo,
  testCompanies,
  testCompany1Logo,
  testCompany2Logo,
  testDocFile,
  testDocxFile,
  testPdfFile,
  updateCompanyBody,
  updateCompanyResponse,
  userWorkplaces,
} from './mocks';

describe('CompanyController', () => {
  let app: INestApplication;
  let companyRepository: CompanyRepository;
  let userPositionRepository: UserPositionRepository;
  let userWorkplaceRepository: UserWorkplaceRepository;
  let blockchainService: RabbitmqBlockchainService;
  let fileService: FileService;
  let cosignatoryService: CosignatoryService;

  const otherAllianceCompanyId: number = testCompanies[5].id;
  const mainAllianceCompanies = testCompanies.filter(company => company.allianceId === MAIN_ALLIANCE_ID);

  beforeAll(async (done) => {
    app = await initApp();
    companyRepository = app.get(CompanyRepository);
    userPositionRepository = app.get(UserPositionRepository);
    userWorkplaceRepository = app.get(UserWorkplaceRepository);
    cosignatoryService = app.get(CosignatoryService);
    blockchainService = app.get(RabbitmqBlockchainService);
    fileService = app.get(FileService);

    await insertQuery(FileEntity, [testCompany1Logo, testCompany2Logo, newLogo, testPdfFile, testDocFile, testDocxFile]);
    done();
  });

  afterAll(async () => {
    await clearQuery(FileEntity);
    await clearQuery(AllianceEntity);

    await app.close();
  });

  describe('createCompany', () => {
    let registerCompanySpy;

    beforeAll(async () => {
      registerCompanySpy = jest
        .spyOn(blockchainService, 'sendRegisterCompanyEvent')
        .mockImplementation(() => Promise.resolve());
    });

    afterEach(() => {
      registerCompanySpy.mockReset();
    });

    describe('error', () => {
      beforeAll(async () => {
        await insertQuery(CompanyEntity, testCompanies);
      });

      afterAll(async () => {
        await clearQuery(CompanyEntity);
      });

      const companyWithLogoNotFound: CreateCompanyBodyDTO = { ...createCompanyBody, logoId: 100 };
      const companyWithLogoExist: CreateCompanyBodyDTO = { ...createCompanyBody, logoId: testCompanies[0].logoId };

      it.each([
        ['Logo not found', companyWithLogoNotFound, 'logoId', FILE_ERRORS.FILE_NOT_FOUND],
        ['Logo exist', companyWithLogoExist, 'logoId', FILE_ERRORS.FILE_IS_ALREADY_USED],
      ])
      ('should return exception: %p', async (title, company, field, message) => {
        return request(app.getHttpServer())
          .post('/api/v1/companies')
          .send(company)
          .expect(HttpStatus.UNPROCESSABLE_ENTITY)
          .then(({ body }) => {
            const { errors } = body;
            expect(errors[0].field).toEqual(field);
            expect(errors[0].message).toEqual(message);
            expect(registerCompanySpy).not.toHaveBeenCalled();
          });
      });

      it.each([
        ['pdf', testPdfFile],
        ['doc', testDocFile],
        ['docx', testDocxFile],
      ])
      ('should return exception: invalid type for %p file', async (testPdfFile, file) => {
        return request(app.getHttpServer())
          .post('/api/v1/companies')
          .send({ ...createCompanyBody, logoId: file.id })
          .expect(HttpStatus.BAD_REQUEST)
          .then(({ body }) => {
            const { errors } = body;
            expect(errors[0].field).toEqual('logoId');
            expect(errors[0].message).toEqual(FILE_ERRORS.FILE_INVALID_TYPE);
            expect(registerCompanySpy).not.toHaveBeenCalled();
          });
      });

      it.each([USER_ROLE.ADMIN, USER_ROLE.CO_SIGNATORY])
      ('should return forbidden exception for role %p', async (role) => {
        return request(app.getHttpServer())
          .post('/api/v1/companies')
          .set({ role })
          .send(createCompanyBody)
          .expect(HttpStatus.FORBIDDEN)
          .then(({ body }) => {
            const { errors } = body;
            expect(errors[0].message).toEqual(FORBIDDEN_ERROR);
            expect(registerCompanySpy).not.toHaveBeenCalled();
          });
      });
    });

    describe('success', () => {
      afterEach(async () => {
        await clearQuery(CompanyEntity);
      });

      it('should return expected response', async () => {
        return request(app.getHttpServer())
          .post('/api/v1/companies')
          .send(createCompanyBody)
          .expect(HttpStatus.CREATED)
          .then(async ({ body }: { body: CreateCompanyResponseDTO }) => {
            expect(body).toEqual(createCompanyResponse(body.company.id));
          });
      });

      it('should save company to database with alliance', async () => {
        const dbCompanies = await companyRepository.find();
        expect(dbCompanies.length).toEqual(0);
        return request(app.getHttpServer())
          .post('/api/v1/companies')
          .send(createCompanyBody)
          .expect(HttpStatus.CREATED)
          .then(async ({ body }: { body: CreateCompanyResponseDTO }) => {
            const dbCompany = await companyRepository.findOne({ where: { id: body.company.id } });
            expect(dbCompany).toBeDefined();
            expect(dbCompany.email).toEqual(createCompanyBody.email);
            expect(dbCompany.status).toEqual(COMPANY_STATUS.ACTIVE);
            expect(dbCompany.normalizedEmail).toEqual(validator.normalizeEmail(createCompanyBody.email));
            expect(dbCompany.logoId).toEqual(createCompanyBody.logoId);
            expect(dbCompany.allianceId).toEqual(MAIN_ALLIANCE_ID);
          });
      });

      it('should log changes', async () => {
        return request(app.getHttpServer())
          .post('/api/v1/companies')
          .send(createCompanyBody)
          .expect(HttpStatus.CREATED)
          .then((async ({ body }: { body: CreateCompanyResponseDTO }) => {
            const logs = await getManyQuery(CompanyLogEntity, { companyId: body.company.id });
            expect(logs.length).toEqual(Object.values(createCompanyBody).length);
            logs.forEach(log => expect(log.oldValue).toEqual(null));
            expect(logs.find(log => log.parameter === COMPANY_LOG_PARAM.NAME).newValue).toEqual(createCompanyBody.name);
            expect(logs.find(log => log.parameter === COMPANY_LOG_PARAM.EMAIL).newValue).toEqual(createCompanyBody.email);
            expect(logs.find(log => log.parameter === COMPANY_LOG_PARAM.REGISTRATION_NUMBER).newValue).toEqual(createCompanyBody.registrationNumber);
            expect(logs.find(log => log.parameter === COMPANY_LOG_PARAM.ADDRESS).newValue).toEqual(createCompanyBody.address);
            expect(logs.find(log => log.parameter === COMPANY_LOG_PARAM.FINANCIAL_YEAR_END_DATE).newValue).toEqual(createCompanyBody.financialYearEndDate);
            expect(logs.find(log => log.parameter === COMPANY_LOG_PARAM.NEXT_MEETING_DATE).newValue).toEqual(createCompanyBody.nextMeetingDate);
            expect(logs.find(log => log.parameter === COMPANY_LOG_PARAM.INCORPORATION_DATE).newValue).toEqual(createCompanyBody.incorporationDate);
            expect(logs.find(log => log.parameter === COMPANY_LOG_PARAM.WEBSITE).newValue).toEqual(createCompanyBody.website);
            expect(logs.find(log => log.parameter === COMPANY_LOG_PARAM.PROFILE).newValue).toEqual(createCompanyBody.profile);
            expect(logs.find(log => log.parameter === COMPANY_LOG_PARAM.COMMENT).newValue).toEqual(createCompanyBody.comment);
            expect(logs.find(log => log.parameter === COMPANY_LOG_PARAM.PHONE_NUMBER).newValue).toEqual(createCompanyBody.phoneNumber);
            expect(logs.find(log => log.parameter === COMPANY_LOG_PARAM.LOGO_NAME).newValue).toEqual(newLogo.originalName);
          }));
      });

      it('should send event to blockchain', async () => {
        return request(app.getHttpServer())
          .post('/api/v1/companies')
          .send(createCompanyBody)
          .expect(HttpStatus.CREATED)
          .then((async ({ body }: { body: CreateCompanyResponseDTO }) => {
            const { company } = body;
            expect(registerCompanySpy).toHaveBeenCalledTimes(1);
            expect(registerCompanySpy).toHaveBeenCalledWith({ id: company.id.toString() });
          }));
      });
    });
  });

  describe('deleteCompany', () => {
    const existingCompanyId: number = testCompanies[0].id;
    const existingCompanyLogoId: number = testCompanies[0].logoId;

    let removeFileSpy;
    let getResolutionsInfoSpy;
    let deleteCosignatoryWorkplaceSpy;

    beforeAll(async () => {
      removeFileSpy = jest
        .spyOn(fileService, 'removeFile')
        .mockImplementation(() => Promise.resolve());
      deleteCosignatoryWorkplaceSpy = jest
        .spyOn(cosignatoryService, 'deleteCosignatoryWorkplace')
        .mockImplementation(() => Promise.resolve(null));
      getResolutionsInfoSpy = jest
        .spyOn(blockchainService, 'getResolutionsInfo')
        .mockImplementation(() => Promise.resolve({ count: 0, resolutionsInfo: [] }));
    });

    beforeEach(async () => {
      await insertQuery(CompanyEntity, testCompanies);
      await insertQuery(UserEntity, deleteCompanyUsers);
      await insertQuery(UserWorkplaceEntity, deleteCompanyWorkplaces);
      await insertQuery(UserPositionEntity, deleteCompanyUsersPositions);
    });

    afterEach(async () => {
      await clearQuery(UserPositionEntity);
      await clearQuery(UserWorkplaceEntity);
      await clearQuery(CompanyEntity);
      await removeByIdsQuery(UserEntity, deleteCompanyUsers);
      removeFileSpy.mockClear();
      deleteCosignatoryWorkplaceSpy.mockClear();
      getResolutionsInfoSpy.mockClear();
    });

    describe('error', () => {
      it('should return exception: Company not found for other alliance', async () => {
        const dbCompany = await companyRepository.findOne({ where: { id: otherAllianceCompanyId } });
        expect(dbCompany).toBeDefined();

        return request(app.getHttpServer())
          .delete(`/api/v1/companies/${otherAllianceCompanyId}`)
          .expect(HttpStatus.NOT_FOUND)
          .then(({ body }) => {
            const { errors } = body;
            expect(errors[0].field).toEqual('id');
            expect(errors[0].message).toEqual(COMPANY_ERRORS.COMPANY_NOT_FOUND);
            expect(removeFileSpy).not.toHaveBeenCalled();
          });
      });

      it('should return exception: Company not found', async () => {
        return request(app.getHttpServer())
          .delete('/api/v1/companies/100')
          .expect(HttpStatus.NOT_FOUND)
          .then(({ body }) => {
            const { errors } = body;
            expect(errors[0].field).toEqual('id');
            expect(errors[0].message).toEqual(COMPANY_ERRORS.COMPANY_NOT_FOUND);
            expect(getResolutionsInfoSpy).not.toHaveBeenCalled();
            expect(removeFileSpy).not.toHaveBeenCalled();
            expect(deleteCosignatoryWorkplaceSpy).not.toHaveBeenCalled();
          });
      });

      it('should return exception: Company has active resolutions', async () => {
        getResolutionsInfoSpy.mockImplementationOnce(() => Promise.resolve({ resolutionsInfo: [null] }));

        return request(app.getHttpServer())
          .delete(`/api/v1/companies/${existingCompanyId}`)
          .expect(HttpStatus.UNPROCESSABLE_ENTITY)
          .then(({ body }) => {
            const { errors } = body;
            expect(errors[0].field).toEqual('id');
            expect(errors[0].message).toEqual(COMPANY_ERRORS.COMPANY_HAS_RESOLUTIONS);
            expect(getResolutionsInfoSpy).toHaveBeenCalledTimes(1);
            expect(getResolutionsInfoSpy).toHaveBeenCalledWith({ companyId: existingCompanyId });
            expect(removeFileSpy).not.toHaveBeenCalled();
            expect(deleteCosignatoryWorkplaceSpy).not.toHaveBeenCalled();
          });
      });

      it.each([USER_ROLE.ADMIN, USER_ROLE.CO_SIGNATORY])
      ('should return forbidden exception for role %p', async (role) => {
        return request(app.getHttpServer())
          .delete('/api/v1/companies/100')
          .set({ role })
          .expect(HttpStatus.FORBIDDEN)
          .then(({ body }) => {
            const { errors } = body;
            expect(errors[0].message).toEqual(FORBIDDEN_ERROR);
            expect(removeFileSpy).not.toHaveBeenCalled();
            expect(getResolutionsInfoSpy).not.toHaveBeenCalled();
            expect(deleteCosignatoryWorkplaceSpy).not.toHaveBeenCalled();
          });
      });
    });

    describe('success', () => {
      it('should delete company', async () => {
        const dbCompany = await companyRepository.findOne({ where: { id: existingCompanyId } });
        expect(dbCompany).toBeDefined();

        return request(app.getHttpServer())
          .delete(`/api/v1/companies/${existingCompanyId}`)
          .expect(HttpStatus.OK)
          .then(async ({ body }: { body: DeleteCompanyResponseDTO }) => {
            expect(body).toEqual(deleteCompanyResponse(body.company.id));
            expect(getResolutionsInfoSpy).toHaveBeenCalledTimes(1);

            const dbCompany = await companyRepository.findOne({ where: { id: existingCompanyId } });
            expect(dbCompany).toBeUndefined();
          });
      });

      it('should delete logo', async () => {
        return request(app.getHttpServer())
          .delete(`/api/v1/companies/${existingCompanyId}`)
          .expect(HttpStatus.OK)
          .then(() => {
            expect(removeFileSpy).toHaveBeenCalledTimes(1);
            expect(removeFileSpy).toHaveBeenCalledWith(existingCompanyLogoId);
          });
      });

      it('should return expected response', async () => {
        return request(app.getHttpServer())
          .delete(`/api/v1/companies/${existingCompanyId}`)
          .expect(HttpStatus.OK)
          .then(async ({ body }: { body: DeleteCompanyResponseDTO }) => {
            expect(body).toEqual(deleteCompanyResponse(existingCompanyId));
          });
      });

      it('should delete company workplaces', async () => {
        const { workplaces } = await companyRepository.findOne({
          where: { id: existingCompanyId },
          relations: ['workplaces', 'workplaces.positions'],
        });
        const usersIds = workplaces.map(workplace => workplace.userId);

        const companyWorkplaces = await userWorkplaceRepository.find();
        const positions = await userPositionRepository.find();

        expect(companyWorkplaces.length).toEqual(deleteCompanyWorkplaces.length);
        expect(positions.length).toEqual(deleteCompanyUsersPositions.length);

        return request(app.getHttpServer())
          .delete(`/api/v1/companies/${existingCompanyId}`)
          .expect(HttpStatus.OK)
          .then(async () => {
            expect(deleteCosignatoryWorkplaceSpy).toHaveBeenCalledTimes(usersIds.length);
            usersIds.forEach((id) => {
              expect(deleteCosignatoryWorkplaceSpy).toHaveBeenCalledWith(workplaces.find(workplace => workplace.userId === id));
            });

            const companyWorkplaces = await userWorkplaceRepository.find();
            const positions = await userPositionRepository.find();
            expect(companyWorkplaces.length).toEqual(0);
            expect(positions.length).toEqual(0);
          });
      });
    });
  });

  describe('updateCompany', () => {
    let updateCompany: CompanyEntity;
    let removeFileSpy;

    beforeAll(async () => {
      removeFileSpy = jest
        .spyOn(fileService, 'removeFile')
        .mockImplementation(() => Promise.resolve());
    });

    beforeEach(async () => {
      const existingCompanies = await insertQuery(CompanyEntity, testCompanies);
      updateCompany = existingCompanies[0];
    });

    afterEach(async () => {
      await clearQuery(CompanyEntity);
      removeFileSpy.mockReset();
    });

    describe('error', () => {
      const companyWithLogoNotFound: CreateCompanyBodyDTO = { ...updateCompanyBody, logoId: 100 };
      const companyWithLogoExist: CreateCompanyBodyDTO = { ...updateCompanyBody, logoId: testCompanies[1].logoId };

      it('should return exception: Company not found for other alliance', async () => {
        const dbCompany = await companyRepository.findOne({ where: { id: otherAllianceCompanyId } });
        expect(dbCompany).toBeDefined();

        return request(app.getHttpServer())
          .put(`/api/v1/companies/${otherAllianceCompanyId}`)
          .send(updateCompanyBody)
          .expect(HttpStatus.NOT_FOUND)
          .then(({ body }) => {
            const { errors } = body;
            expect(errors[0].field).toEqual('id');
            expect(errors[0].message).toEqual(COMPANY_ERRORS.COMPANY_NOT_FOUND);
          });
      });

      it('should return exception: Company not found', async () => {
        return request(app.getHttpServer())
          .put('/api/v1/companies/100')
          .send(updateCompanyBody)
          .expect(HttpStatus.NOT_FOUND)
          .then(({ body }) => {
            const { errors } = body;
            expect(errors[0].field).toEqual('id');
            expect(errors[0].message).toEqual(COMPANY_ERRORS.COMPANY_NOT_FOUND);
          });
      });

      it.each([
        ['Logo not found', companyWithLogoNotFound, 'logoId', FILE_ERRORS.FILE_NOT_FOUND],
        ['Logo exist', companyWithLogoExist, 'logoId', FILE_ERRORS.FILE_IS_ALREADY_USED],
      ])
      ('should return exception: %p', async (title, company, field, message) => {
        return request(app.getHttpServer())
          .put(`/api/v1/companies/${testCompanies[0].id}`)
          .send(company)
          .expect(HttpStatus.UNPROCESSABLE_ENTITY)
          .then(({ body }) => {
            const { errors } = body;
            expect(errors[0].field).toEqual(field);
            expect(errors[0].message).toEqual(message);
            expect(removeFileSpy).not.toHaveBeenCalled();
          });
      });

      it.each([USER_ROLE.ADMIN, USER_ROLE.CO_SIGNATORY])
      ('should return forbidden exception for role %p', async (role) => {
        return request(app.getHttpServer())
          .put('/api/v1/companies/100')
          .send(updateCompanyBody)
          .set({ role })
          .expect(HttpStatus.FORBIDDEN)
          .then(({ body }) => {
            const { errors } = body;
            expect(errors[0].message).toEqual(FORBIDDEN_ERROR);
          });
      });
    });

    describe('success', () => {
      it.each([updateCompanyBody])
      ('should update company', async (company: UpdateCompanyBodyDTO) => {
        return request(app.getHttpServer())
          .put(`/api/v1/companies/${updateCompany.id}`)
          .send(company)
          .expect(HttpStatus.OK)
          .then(async () => {
            const dbCompany = await companyRepository.findOne({ where: { id: updateCompany.id } });
            expect(dbCompany).not.toBeUndefined();
            dbCompany.incorporationDate = moment(dbCompany.incorporationDate).toISOString();
            dbCompany.nextMeetingDate = moment(dbCompany.nextMeetingDate).toISOString();
            dbCompany.financialYearEndDate = moment(dbCompany.financialYearEndDate).toISOString();
            expect(dbCompany).toMatchObject(company);
          });
      });

      it('should delete old logo', async () => {
        return request(app.getHttpServer())
          .put(`/api/v1/companies/${updateCompany.id}`)
          .send(updateCompanyBody)
          .expect(HttpStatus.OK)
          .then(() => {
            expect(removeFileSpy).toHaveBeenCalledTimes(1);
            expect(removeFileSpy).toHaveBeenCalledWith(updateCompany.logoId);
          });
      });

      it('should not delete current logo', async () => {
        return request(app.getHttpServer())
          .put(`/api/v1/companies/${updateCompany.id}`)
          .send({ ...updateCompanyBody, logoId: updateCompany.logoId })
          .expect(HttpStatus.OK)
          .then(() => {
            expect(removeFileSpy).toHaveBeenCalledTimes(0);
          });
      });

      it('should log changes', async () => {
        return request(app.getHttpServer())
          .put(`/api/v1/companies/${updateCompany.id}`)
          .send(updateCompanyBody)
          .expect(HttpStatus.OK)
          .then((async ({ body }: { body: UpdateCompanyResponseDTO }) => {
            const logs = await getManyQuery(CompanyLogEntity, { companyId: body.company.id });
            expect(logs.length).toEqual(3);
            expect(logs.find(log => log.parameter === COMPANY_LOG_PARAM.NAME).oldValue).toEqual(updateCompany.name);
            expect(logs.find(log => log.parameter === COMPANY_LOG_PARAM.NAME).newValue).toEqual(updateCompanyBody.name);
            expect(logs.find(log => log.parameter === COMPANY_LOG_PARAM.EMAIL).oldValue).toEqual(updateCompany.email);
            expect(logs.find(log => log.parameter === COMPANY_LOG_PARAM.EMAIL).newValue).toEqual(updateCompanyBody.email);
            expect(logs.find(log => log.parameter === COMPANY_LOG_PARAM.LOGO_NAME).oldValue).toEqual(testCompany1Logo.originalName);
            expect(logs.find(log => log.parameter === COMPANY_LOG_PARAM.LOGO_NAME).newValue).toEqual(newLogo.originalName);
          }));
      });

      it('should return expected response', async () => {
        return request(app.getHttpServer())
          .put(`/api/v1/companies/${updateCompany.id}`)
          .send(updateCompanyBody)
          .expect(HttpStatus.OK)
          .then(async ({ body }: { body: UpdateCompanyResponseDTO }) => {
            expect(body).toEqual(updateCompanyResponse(body.company.id));
          });
      });
    });
  });

  describe('getCompany', () => {
    const existingCompanyId: number = testCompanies[0].id;
    beforeEach(async () => {
      await insertQuery(CompanyEntity, testCompanies);
    });

    afterEach(async () => {
      await clearQuery(CompanyEntity);
    });

    describe('error', () => {

      it('should return exception: Company not found for other alliance', async () => {
        const dbCompany = await companyRepository.findOne({ where: { id: otherAllianceCompanyId } });
        expect(dbCompany).toBeDefined();

        return request(app.getHttpServer())
          .get(`/api/v1/companies/${otherAllianceCompanyId}`)
          .expect(HttpStatus.NOT_FOUND)
          .then(({ body }) => {
            const { errors } = body;
            expect(errors[0].field).toEqual('id');
            expect(errors[0].message).toEqual(COMPANY_ERRORS.COMPANY_NOT_FOUND);
          });
      });

      it('should return exception: Company not found', async () => {
        return request(app.getHttpServer())
          .get('/api/v1/companies/100')
          .expect(HttpStatus.NOT_FOUND)
          .then(({ body }) => {
            const { errors } = body;
            expect(errors[0].field).toEqual('id');
            expect(errors[0].message).toEqual(COMPANY_ERRORS.COMPANY_NOT_FOUND);
          });
      });

      it.each([USER_ROLE.ADMIN, USER_ROLE.CO_SIGNATORY])
      ('should return forbidden exception for role %p', async (role) => {
        return request(app.getHttpServer())
          .get('/api/v1/companies/100')
          .set({ role })
          .expect(HttpStatus.FORBIDDEN)
          .then(({ body }) => {
            const { errors } = body;
            expect(errors[0].message).toEqual(FORBIDDEN_ERROR);
          });
      });
    });

    describe('success', () => {
      it('should get company', async () => {
        return request(app.getHttpServer())
          .get(`/api/v1/companies/${existingCompanyId}`)
          .expect(HttpStatus.OK)
          .then(async ({ body: company }: { body: GetCompanyResponseDTO }) => {
            expect(company).not.toBeUndefined();
            expect(company).toEqual(getCompanyResponse);
          });
      });
    });
  });

  describe('getCompanies', () => {
    beforeAll(async () => {
      await insertQuery(CompanyEntity, testCompanies);
      await insertQuery(UserEntity, [getCompaniesActiveUser, getCompaniesInactiveUser]);
      await insertQuery(UserWorkplaceEntity, getCompaniesWorkplaces);
    });

    afterAll(async () => {
      await clearQuery(UserWorkplaceEntity);
      await clearQuery(CompanyEntity);
      await removeByIdsQuery(UserEntity, [getCompaniesActiveUser, getCompaniesInactiveUser]);
    });

    describe('error', () => {
      it.each([USER_ROLE.ADMIN, USER_ROLE.CO_SIGNATORY])
      ('should return forbidden exception for role %p', async (role) => {
        return request(app.getHttpServer())
          .get('/api/v1/companies')
          .set({ role })
          .expect(HttpStatus.FORBIDDEN)
          .then(({ body }) => {
            const { errors } = body;
            expect(errors[0].message).toEqual(FORBIDDEN_ERROR);
          });
      });
    });

    describe('success', () => {

      it('should return expected response', async () => {
        return request(app.getHttpServer())
          .get('/api/v1/companies')
          .expect(HttpStatus.OK)
          .then(async ({ body }: { body: GetCompaniesResponseDTO }) => {
            const { count, companies } = body;
            expect(count).toEqual(mainAllianceCompanies.length);
            expect(companies).toEqual(getCompaniesResponse);
          });
      });

      it('should not return other alliance companies', async () => {
        const dbCompanies = await companyRepository.find({ where: { allianceId: OTHER_ALLIANCE_ID } });
        expect(dbCompanies.length).toBeGreaterThan(0);

        return request(app.getHttpServer())
          .get('/api/v1/companies')
          .expect(HttpStatus.OK)
          .then(async ({ body }: { body: GetCompaniesResponseDTO }) => {
            const { companies } = body;
            expect(companies.filter(company => company.id === otherAllianceCompanyId).length).toEqual(0);
          });
      });

      it('should return companies by name', async () => {
        const searchName = 'Google';
        return request(app.getHttpServer())
          .get('/api/v1/companies')
          .query({ name: searchName })
          .expect(HttpStatus.OK)
          .then(async ({ body }: { body: GetCompaniesResponseDTO }) => {
            const { count, companies } = body;
            expect(count).toEqual(1);
            expect(companies[0].name).toEqual(searchName);
          });
      });

      it.each([SORT_ORDER.ASC, SORT_ORDER.DESC])
      ('should return companies sorted by name, sortOrder: %p', async (sortOrder: string) => {
        return request(app.getHttpServer())
          .get('/api/v1/companies')
          .query({ sortParam: COMPANY_SORT_PARAM.NAME, sortOrder })
          .expect(HttpStatus.OK)
          .then(async ({ body }: { body: GetCompaniesResponseDTO }) => {
            const sortedCompaniesNames = getCompaniesResponse.map(company => company.name).sort();

            if (sortOrder === SORT_ORDER.DESC) {
              sortedCompaniesNames.reverse();
            }
            const { companies } = body;
            expect(companies.map(company => company.name)).toEqual(sortedCompaniesNames);
          });
      });

      it.each([[0, 10, 5], [0, 3, 3], [3, 3, 2], [3, 5, 2], [10, 1, 0]])
      ('should return companies by pagination, skip: %p, limit: %p', async (skip: number, limit: number, length: number) => {
        return request(app.getHttpServer())
          .get('/api/v1/companies')
          .query({ skip, limit })
          .expect(HttpStatus.OK)
          .then(async ({ body }: { body: GetCompaniesResponseDTO }) => {
            const { count, companies } = body;
            expect(count).toEqual(mainAllianceCompanies.length);
            expect(limit).toEqual(limit);
            expect(skip).toEqual(skip);

            expect(companies.length).toEqual(length);
          });
      });
    });
  });

  describe('getCompanyUsers', () => {
    const foreignCosignCompanyIds = testCompanies
      .filter(({ allianceId }) => allianceId === MAIN_ALLIANCE_ID)
      .filter(({ id }) => id !== cosignatoryCompanyId)
      .map(({ id }) => id);

    beforeAll(async () => {
      await insertQuery(CompanyEntity, testCompanies);
      await insertQuery(UserEntity, companyUsers);
      await insertQuery(UserWorkplaceEntity, [...userWorkplaces, baseCosignWorkplace]);
    });

    afterAll(async () => {
      await clearQuery(UserWorkplaceEntity);
      await clearQuery(CompanyEntity);
      await removeByIdsQuery(UserEntity, companyUsers);
    });

    describe('error', () => {
      it('should return exception: Company not found for other alliance', async () => {
        const dbCompany = await companyRepository.findOne({ where: { id: otherAllianceCompanyId } });
        expect(dbCompany).toBeDefined();

        return request(app.getHttpServer())
          .get(`/api/v1/companies/${otherAllianceCompanyId}/users`)
          .expect(HttpStatus.NOT_FOUND)
          .then(({ body }) => {
            const { errors } = body;
            expect(errors[0].field).toEqual('id');
            expect(errors[0].message).toEqual(COMPANY_ERRORS.COMPANY_NOT_FOUND);
          });
      });

      it('should return exception: Company not found', async () => {
        return request(app.getHttpServer())
          .get('/api/v1/companies/100/users')
          .expect(HttpStatus.NOT_FOUND)
          .then(({ body }) => {
            const { errors } = body;
            expect(errors[0].field).toEqual('id');
            expect(errors[0].message).toEqual(COMPANY_ERRORS.COMPANY_NOT_FOUND);
          });
      });

      it.each(foreignCosignCompanyIds)
      ('should return forbidden exception for CO_SIGNATORY foreign companyId %p', async (companyId) => {
        return request(app.getHttpServer())
          .get(`/api/v1/companies/${companyId}/users`)
          .set({ role: USER_ROLE.CO_SIGNATORY })
          .expect(HttpStatus.FORBIDDEN)
          .then(({ body }) => {
            const { errors } = body;
            expect(errors[0].message).toEqual(FORBIDDEN_ERROR);
          });
      });

      it.each([USER_ROLE.ADMIN])
      ('should return forbidden exception for role %p', async (role) => {
        return request(app.getHttpServer())
          .get('/api/v1/companies/100/users')
          .set({ role })
          .expect(HttpStatus.FORBIDDEN)
          .then(({ body }) => {
            const { errors } = body;
            expect(errors[0].message).toEqual(FORBIDDEN_ERROR);
          });
      });
    });

    describe('success', () => {

      it.each([1, 2, 3, 4, 5])
      ('should get company %p users for role CO_SECRETARY', async (existingCompanyId) => {
        return request(app.getHttpServer())
          .get(`/api/v1/companies/${existingCompanyId}/users`)
          .expect(HttpStatus.OK)
          .then(({ body }: { body: GetCompanyUsersResponseDTO }) => {
            const { users } = body;
            users.forEach(user => {
              user.workplaces.forEach(workplace => {
                expect(workplace.companyId).toEqual(existingCompanyId);
              });
            });
            expect(users).toEqual(getCompanyUsersForCosecResponse(existingCompanyId));
          });
      });

      it.each([USER_ROLE.CO_SECRETARY])
      ('should not get deactivated users for role %p', async (role) => {
        return request(app.getHttpServer())
          .get(`/api/v1/companies/${cosignatoryCompanyId}/users`)
          .set({ role })
          .expect(HttpStatus.OK)
          .then(({ body }: { body: GetCompanyUsersResponseDTO }) => {
            const { users } = body;
            expect(users.filter((user) => user.status === USER_STATUS.INACTIVE).length).toBe(0);
          });
      });
    });
  });
});
