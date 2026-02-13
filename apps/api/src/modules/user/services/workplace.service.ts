import { COMPANY_ERRORS, COMPANY_LOG_PARAM, USER_ROLE, WORKPLACE_ERRORS } from '@flact/constants';
import { CompanyEntity, CompanyLogEntity, UserEntity, UserWorkplaceEntity } from '@flact/entities';
import { BadRequestError, UnprocessableEntityError } from '@flact/exceptions';
import { Injectable } from '@nestjs/common';
import { DeepPartial } from 'typeorm/common/DeepPartial';
import { CompanyLogService } from '../../company/services/company.log.service';
import { RabbitmqBlockchainService } from '../../rabbitmq/services/rabbitmq.blockchain.service';
import { validateWorkplaceDataOrFail } from '../helpers/user.validator.helper';
import { CompanyRepository } from '../repositories/company.repository';

@Injectable()
export class WorkplaceService {

  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly rabbitmqBlockchainService: RabbitmqBlockchainService,
    private readonly companyLogService: CompanyLogService,
  ) {
  }

  private async getCompanyOrFail(companyId: number, allianceId: number, relations: string[] = []): Promise<CompanyEntity> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId, allianceId },
      relations: relations || [],
    });
    if (!company) {
      throw new UnprocessableEntityError([{ field: 'companyId', message: COMPANY_ERRORS.COMPANY_NOT_FOUND }]);
    }
    return company;
  }

  async validateWorkplaces(workplaces: DeepPartial<UserWorkplaceEntity>[], allianceId: number) {
    const validatedCompanyIds = [];
    await Promise.all(workplaces.map(async ({ companyId, votingValue }) => {
      if (validatedCompanyIds.includes(companyId)) {
        throw new BadRequestError([{ field: 'workplaces', message: WORKPLACE_ERRORS.WORKPLACES_MUST_BE_UNIQUE }]);
      }
      validatedCompanyIds.push(companyId);
      if (votingValue) {
        const company = await this.getCompanyOrFail(companyId, allianceId, ['workplaces', 'workplaces.user']);
        await validateWorkplaceDataOrFail(company.workplaces, { votingValue });
      }
    }));
  };

  async registerWorkplacesInBlockchain({ id, workplaces }: Partial<UserEntity>) {
    await Promise.all(workplaces.map(({ positions, companyId, vetoPower, votingValue }) => {
      const positionNames = positions.map(position => position.name);
      this.rabbitmqBlockchainService.sendRegisterCosignatoryEvent(positionNames, id, companyId, votingValue, vetoPower);
    }));
  }

  async logNewWorkplaces(workplaces: DeepPartial<UserWorkplaceEntity>[], role: USER_ROLE, authorId: number) {
    const logs: Partial<CompanyLogEntity>[] = workplaces.map(workplace => ({
      companyId: workplace.companyId,
      authorId,
      parameter: (role === USER_ROLE.CO_SIGNATORY) ? COMPANY_LOG_PARAM.COSIGN_INVITATION : COMPANY_LOG_PARAM.COSEC_INVITATION,
      newValue: workplace.userId.toString(),
    }));

    return this.companyLogService.addLogs(logs);
  }
}
