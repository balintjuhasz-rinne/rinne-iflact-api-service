import { COMPANY_LOG_PARAM } from '@flact/constants';
import { CompanyEntity, CompanyLogEntity } from '@flact/entities';
import { Injectable } from '@nestjs/common';
import _ from 'lodash';
import { DeepPartial } from 'typeorm';
import { CompanyLogRepository } from '../repositories/company.log.repository';

@Injectable()
export class CompanyLogService {

  constructor(
    private readonly logRepository: CompanyLogRepository,
  ) {}

  async logEntityChanges(company: Partial<CompanyEntity>, authorId: number, newValues: Partial<CompanyEntity>): Promise<void> {
    const expandedNewValues = CompanyLogService.expandValues(newValues);
    const expandedOldValues = CompanyLogService.expandValues(company);
    const values = _.omitBy(expandedNewValues, (v, k) => expandedOldValues[k] === v || !(<any>Object).values(COMPANY_LOG_PARAM).includes(k));

    const logs: DeepPartial<CompanyLogEntity[]> = Object.entries(values).map(([key, newValue]) => ({
      companyId: company.id, authorId, parameter: <COMPANY_LOG_PARAM>key,
      oldValue: expandedOldValues[key], newValue,
    }));

    await this.addLogs(logs);
  }

  async addLogs(logs: DeepPartial<CompanyLogEntity>[]): Promise<CompanyLogEntity[]> {
    return this.logRepository.save(logs);
  }

  private static expandValues(company: Partial<CompanyEntity>): Record<string, any> {
    return {
      ...company,
      ...(company.incorporationDate && { incorporationDate: new Date(company.incorporationDate).toISOString() }),
      ...(company.financialYearEndDate && { financialYearEndDate: new Date(company.financialYearEndDate).toISOString() }),
      ...(company.nextMeetingDate && { nextMeetingDate: new Date(company.nextMeetingDate).toISOString() }),
      ...(company.logoId && { logoName: company.logo?.originalName }),
      ...(company.logoId === null && { logoName: null }),
    };
  }
}
