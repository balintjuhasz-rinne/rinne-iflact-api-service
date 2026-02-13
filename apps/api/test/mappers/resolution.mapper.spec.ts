import { RESOLUTION_TYPE } from '@flact/constants';
import { ResolutionDTO } from '@flact/dtos';
import { mapResolutionToResolutionDTO } from '../../src/modules/resolution/mappers';
import { Resolution } from './../../src/modules/resolution/models/resolution.model';

const now = new Date().toISOString();

describe('mapResolutionToResolutionDTO', () => {

  it('should map resoltuion to resolution dto', () => {
    const common = { name: 'Resolution', description: 'Long way', hashes: ['hash'], emergency: true };
    const resolution: Partial<Resolution> = {
      ...common,
      companyId: 2,
      cosecId: 2,
      type: RESOLUTION_TYPE.MEMBERS_SHAREHOLDERS_AFFAIR,
      approvalRatio: 30,
      votingStartDate: now,
      votingEndDate: now,
    };

    const resolutionDTO: Partial<ResolutionDTO> = {
      ...common,
      company_id: 2,
      cosec_id: 2,
      type: 2,
      approval_ratio: 30,
      start_date: now,
      end_date: now,
    };

    expect(mapResolutionToResolutionDTO(resolution)).toEqual(resolutionDTO);
  });

  it('should skip missing properties', () => {
    const resolution: Partial<Resolution> = { approvalRatio: 30, documents: [] };
    const resolutionDTO: Partial<ResolutionDTO> = { approval_ratio: 30 };

    expect(mapResolutionToResolutionDTO(resolution)).toEqual(resolutionDTO);
  });
});
