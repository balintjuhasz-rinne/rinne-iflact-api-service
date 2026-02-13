import {
  COMPANY_MAX_COMMENT_LENGTH,
  COMPANY_MAX_PROFILE_LENGTH,
  COMPANY_SORT_PARAM,
  FORM_ERRORS,
  SORT_ORDER,
} from '@flact/constants';
import { CompanyEntity, CompanyLogEntity, UserEntity } from '@flact/entities';
import { ApiPropertyOptional, ApiResponseProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsOptional, IsUrl } from 'class-validator';
import {
  ApiPropertyDate,
  ApiPropertyEmail,
  ApiPropertyEnum,
  ApiPropertyId,
  ApiPropertyPhoneNumber,
  ApiPropertyString,
} from '../../../decorators/properties';
import { RequestPaginationDTO, ResponsePaginationDTO } from '../../../dtos/pagination.dto';

export class CreateCompanyBodyDTO {
  @ApiPropertyString({ minLength: 1, maxLength: 128, example: 'Nick' })
  name: string;

  @ApiPropertyEmail()
  email: string;

  @ApiPropertyString({ minLength: 1, maxLength: 256, example: 'USA, Washington 5' })
  address: string;

  @ApiPropertyOptional({ type: String, example: 'https://www.apple.com/' })
  @IsOptional()
  @IsUrl({}, { message: FORM_ERRORS.FIELD_MUST_BE_AN_URL })
  website?: string;

  @ApiPropertyString({ minLength: 1, maxLength: 128, example: 'KE232312921DCS-3' })
  registrationNumber: string;

  @ApiPropertyPhoneNumber()
  phoneNumber: string;

  @ApiPropertyDate()
  incorporationDate: string;

  @ApiPropertyDate()
  financialYearEndDate: string;

  @ApiPropertyDate({ isOptional: true })
  nextMeetingDate?: string | null;

  @ApiPropertyString({ isOptional: true, minLength: 1, maxLength: COMPANY_MAX_PROFILE_LENGTH })
  profile?: string | null;

  @ApiPropertyString({ isOptional: true, minLength: 1, maxLength: COMPANY_MAX_COMMENT_LENGTH })
  comment?: string | null;

  @ApiPropertyId({ isOptional: true })
  logoId?: number | null;
}

export class UpdateCompanyBodyDTO extends CreateCompanyBodyDTO {}

export class CreateCompanyResponseDTO {
  @ApiResponseProperty()
  @Expose()
  result: boolean;
  @ApiResponseProperty()
  @Expose()
  @Type(() => CompanyEntity)
  company: CompanyEntity;

  constructor(data: CreateCompanyResponseDTO) {
    Object.assign(this, data);
  }

}

export class UpdateCompanyResponseDTO extends CreateCompanyResponseDTO {
  constructor(data: UpdateCompanyResponseDTO) {
    super(data);
  }
}

export class DeleteCompanyResponseDTO {
  @ApiResponseProperty()
  @Expose()
  result: boolean;
  @ApiResponseProperty()
  @Expose()
  @Type(() => CompanyEntity)
  company: CompanyEntity;

  constructor(data: DeleteCompanyResponseDTO) {
    Object.assign(this, data);
  }

}

export class GetCompaniesQueryDTO extends RequestPaginationDTO {
  @ApiPropertyString({ isOptional: true, example: 'apple', minLength: 1, maxLength: 128 })
  name?: string;
  @ApiPropertyEnum(COMPANY_SORT_PARAM, { isOptional: true })
  sortParam: COMPANY_SORT_PARAM;
  @ApiPropertyEnum(SORT_ORDER, { isOptional: true })
  sortOrder: SORT_ORDER = SORT_ORDER.ASC;
}

export class GetCompaniesResponseDTO extends ResponsePaginationDTO {

  @ApiResponseProperty({ type: [CompanyEntity] })
  @Expose()
  @Type(() => CompanyEntity)
  companies: CompanyEntity[];

  constructor(data: GetCompaniesResponseDTO) {
    super();
    Object.assign(this, data);
  }
}

export class GetCompanyUsersResponseDTO {

  @ApiResponseProperty({ type: [UserEntity] })
  @Expose()
  @Type(() => UserEntity)
  users: UserEntity[];

  constructor(users: UserEntity[]) {
    this.users = users;
  }
}

export class GetCompanyResponseDTO extends CompanyEntity {
  constructor(company: CompanyEntity) {
    super(company);
    Object.assign(this, company);
  }
}

export class GetCompanyLogsQueryDTO {
  @ApiPropertyString({ isOptional: true })
  name: string;
  @ApiPropertyDate({ isOptional: true })
  startDate: string;
  @ApiPropertyDate({ isOptional: true })
  endDate: string;
}

export class GetCompanyLogsResponseDTO {
  @ApiResponseProperty({ type: [CompanyLogEntity] })
  @Expose()
  @Type(() => CompanyLogEntity)
  logs: CompanyLogEntity[];

  constructor(logs: CompanyLogEntity[]) {
    this.logs = logs;
  }
}
