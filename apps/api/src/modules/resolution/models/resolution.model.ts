import { RESOLUTION_TYPE } from '@flact/constants';
import { CompanyEntity, FileEntity, UserEntity } from '@flact/entities';
import { Expose, Type } from 'class-transformer';

export class Resolution {
  @Expose()
  id: number;
  @Expose()
  @Type(() => CompanyEntity)
  company: CompanyEntity;
  companyId?: number;
  @Expose()
  @Type(() => UserEntity)
  cosec: UserEntity;
  cosecId?: number;
  @Expose()
  name: string;
  @Expose()
  type: RESOLUTION_TYPE;
  @Expose()
  votingStartDate: string;
  @Expose()
  votingEndDate: string;
  @Expose()
  creationDate: string;
  @Expose()
  resolveDate: string;
  @Expose()
  description: string;
  @Expose()
  approvalRatio: number;
  @Expose()
  @Type(() => FileEntity)
  documents: FileEntity[];
  hashes?: string[];
  @Expose()
  cancelReason: string;
  @Expose()
  status: string;
  @Expose()
  emergency: boolean;
}
