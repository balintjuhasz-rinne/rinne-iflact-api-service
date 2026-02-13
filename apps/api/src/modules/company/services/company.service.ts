import {
  COMPANY_ERRORS,
  COMPANY_LOG_PARAM,
  FILE_ERRORS,
  FORBIDDEN_ERROR,
  IMAGE_MIME_TYPES,
  USER_ROLE,
} from '@flact/constants';
import { CompanyEntity, CompanyLogEntity, FileEntity, UserEntity } from '@flact/entities';
import { BadRequestError, ForbiddenError, NotFoundError, UnprocessableEntityError } from '@flact/exceptions';
import { Injectable } from '@nestjs/common';
import { normalizeEmail } from '../../../validators/email.validator';
import { JwtPayload } from '../../auth/dtos/jwt.payload.dto';
import { FileService } from '../../file/services/file.service';
import { RabbitmqBlockchainService } from '../../rabbitmq/services/rabbitmq.blockchain.service';
import { CosignatoryService } from '../../user/services/cosignatory.service';
import {
  CreateCompanyBodyDTO,
  GetCompaniesQueryDTO,
  GetCompaniesResponseDTO, GetCompanyLogsQueryDTO,
  UpdateCompanyBodyDTO,
} from '../dtos/company.controller.dtos';
import { CompanyLogRepository } from '../repositories/company.log.repository';
import { CompanyRepository } from '../repositories/company.repository';
import { FileRepository } from '../repositories/file.repository';
import { UserRepository } from '../repositories/user.repository';
import { UserWorkplaceRepository } from '../repositories/user.workplace.repository';
import { CompanyLogService } from './company.log.service';

const { COSIGN_INVITATION, COSEC_INVITATION } = COMPANY_LOG_PARAM;

@Injectable()
export class CompanyService {

  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly logRepository: CompanyLogRepository,
    private readonly fileRepository: FileRepository,
    private readonly userRepository: UserRepository,
    private readonly userWorkplaceRepository: UserWorkplaceRepository,
    private readonly fileService: FileService,
    private readonly logService: CompanyLogService,
    private readonly cosignatoryService: CosignatoryService,
    private readonly rabbitmqBlockchainService: RabbitmqBlockchainService,
  ) { }

  private async getCompanyOrFail(id: number, allianceId: number, relations: string[] = null): Promise<CompanyEntity> {
    const company = await this.companyRepository.findOne({
      where: {
        id,
        allianceId: allianceId,
      },
      relations: relations || [],
    });

    if (!company) {
      throw new NotFoundError([{ field: 'id', message: COMPANY_ERRORS.COMPANY_NOT_FOUND }]);
    }

    return company;
  }

  private async validateCompanyLogo(logoId: number, companyId: number = null): Promise<FileEntity> {
    if (!logoId) {
      return;
    }

    const logo = await this.fileRepository.findOne({ where: { id: logoId } });
    if (!logo) {
      throw new UnprocessableEntityError([{ field: 'logoId', message: FILE_ERRORS.FILE_NOT_FOUND }]);
    }
    if (!IMAGE_MIME_TYPES.includes(logo.type)) {
      throw new BadRequestError([{ field: 'logoId', message: FILE_ERRORS.FILE_INVALID_TYPE }]);
    }
    const companyWithSameLogo = await this.companyRepository.findOne({ where: { logoId } });
    if (companyWithSameLogo && companyWithSameLogo.id !== companyId) {
      throw new UnprocessableEntityError([{ field: 'logoId', message: FILE_ERRORS.FILE_IS_ALREADY_USED }]);
    }
    return logo;
  }

  async createCompany(newCompany: CreateCompanyBodyDTO, user: JwtPayload): Promise<CompanyEntity> {
    const companyWithSameName = await this.companyRepository.findOne({
      name: newCompany.name,
      allianceId: user.allianceId,
    });
    if (companyWithSameName) {
      throw new UnprocessableEntityError([{ field: 'name', message: COMPANY_ERRORS.COMPANY_WITH_THIS_NAME_EXIST }]);
    }
    const normalizedEmail = normalizeEmail(newCompany.email);

    const newLogo = await this.validateCompanyLogo(newCompany.logoId);
    const createdCompany = await this.saveAndRegisterCompany({
      allianceId: user.allianceId,
      normalizedEmail, ...newCompany,
    });

    await this.logService.logEntityChanges({ id: createdCompany.id }, user.id, { ...newCompany, logo: newLogo });
    return createdCompany;
  }

  async saveAndRegisterCompany(newCompany: Partial<CompanyEntity>) {
    const createdCompany = await this.companyRepository.save(newCompany);
    await this.rabbitmqBlockchainService.sendRegisterCompanyEvent({ id: createdCompany.id.toString() });
    return createdCompany;
  }

  async updateCompany(companyId: number, updateCompany: UpdateCompanyBodyDTO, user: JwtPayload): Promise<CompanyEntity> {
    const company = await this.getCompanyOrFail(companyId, user.allianceId, ['logo']);
    const newLogo = await this.validateCompanyLogo(updateCompany.logoId, companyId);

    const normalizedEmail = normalizeEmail(updateCompany.email);

    if (company.logoId !== updateCompany.logoId) {
      await this.fileService.removeFile(company.logoId);
    }
    await this.companyRepository.update({ id: companyId }, { ...updateCompany, normalizedEmail });

    const newValues = {
      ...updateCompany,
      ...(updateCompany.logoId && { logo: newLogo }),
    };

    await this.logService.logEntityChanges(company, user.id, newValues);
    return this.companyRepository.findOne({ where: { id: companyId } });
  }

  async getCompanies(filters: GetCompaniesQueryDTO, allianceId: number): Promise<GetCompaniesResponseDTO> {
    const [companies, count] = await this.companyRepository.findCompaniesAndCount(filters, allianceId);

    return new GetCompaniesResponseDTO({ limit: filters.limit, skip: filters.skip, count, companies });
  }

  async getCompaniesNames(user: JwtPayload): Promise<CompanyEntity[]> {
    return this.companyRepository.getCompaniesNames(user);
  }

  async getCompany(companyId: number, allianceId: number): Promise<CompanyEntity> {
    return this.getCompanyOrFail(companyId, allianceId, ['logo']);
  }

  async deleteCompany(companyId: number, allianceId: number): Promise<CompanyEntity> {
    const company = await this.getCompanyOrFail(companyId, allianceId, ['workplaces', 'workplaces.positions']);
    const { resolutionsInfo } = await this.rabbitmqBlockchainService.getResolutionsInfo({ companyId });
    if (resolutionsInfo.length) {
      throw new UnprocessableEntityError([{ field: 'id', message: COMPANY_ERRORS.COMPANY_HAS_RESOLUTIONS }]);
    }

    await Promise.all(company.workplaces.map((workplace) => this.cosignatoryService.deleteCosignatoryWorkplace(workplace)));

    await Promise.all([
      this.companyRepository.delete({ id: companyId, allianceId: allianceId }),
      this.fileService.removeFile(company.logoId),
    ]);
    return company;
  }

  async getCompanyUsers(id: number, { role, allianceId, id: cosignId }: JwtPayload): Promise<UserEntity[]> {
    await this.getCompanyOrFail(id, allianceId);
    const filters: Partial<UserEntity> = {};
    if (role === USER_ROLE.CO_SIGNATORY) {
      const userWorkplace = await this.userWorkplaceRepository.findOne({ userId: cosignId, companyId: id });

      if (!userWorkplace) {
        throw new ForbiddenError([{ field: 'id', message: FORBIDDEN_ERROR }]);
      }
      filters.role = USER_ROLE.CO_SIGNATORY;
    }

    return this.userRepository.getCompanyUsers(id, filters);
  }

  async getCompanyLogs(id: number, logFilters: GetCompanyLogsQueryDTO, { allianceId }: JwtPayload): Promise<CompanyLogEntity[]> {
    await this.getCompanyOrFail(id, allianceId);

    const logs = await this.logRepository.getCompanyLogs(id, logFilters);

    return Promise.all(logs.map(async (log) => {
      if (![COSIGN_INVITATION, COSEC_INVITATION].includes(log.parameter)) {
        return log;
      }

      const relatedUser = await this.userRepository.findOne({ id: +log.newValue }, {
        relations: ['avatar'],
        select: ['id', 'name', 'email', 'surname', 'avatar', 'registrationCompleted'],
      });

      return { ...log, relatedUser };
    }));
  }
}
