import { ResolutionTypesNumber } from '@flact/constants';
import { ResolutionDTO } from '@flact/dtos';
import objectMapper from 'object-mapper';
import { Resolution } from '../models/resolution.model';

const mapping = {
  name: 'name',
  votingStartDate: 'start_date',
  votingEndDate: 'end_date',
  description: 'description',
  approvalRatio: 'approval_ratio',
  emergency: 'emergency',
  companyId: 'company_id',
  cosecId: 'cosec_id',
  hashes: 'hashes',
  type: {
    key: 'type',
    transform: (val) => ResolutionTypesNumber[val],
  },

  // --- XRPL contract fields ---
  contractHash: 'contractHash',
  payment1Amount: 'payment1Amount',
  payment1Currency: 'payment1Currency',
  checkCreateSendMaxAmount: 'checkCreateSendMaxAmount',
  checkCreateAmount: 'checkCreateAmount',
  checkCreateCurrency: 'checkCreateCurrency',
  payment2Amount: 'payment2Amount',
  payment2Currency: 'payment2Currency',
  checkCashAmount: 'checkCashAmount',
  checkCashCurrency: 'checkCashCurrency',
};

export const mapResolutionToResolutionDTO = (resolution: Partial<Resolution>): ResolutionDTO => {
  return objectMapper(resolution, mapping);
};
