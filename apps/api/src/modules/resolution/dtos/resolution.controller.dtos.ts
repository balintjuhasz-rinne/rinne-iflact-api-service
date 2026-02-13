import {
  RESOLUTION_CANCEL_REASON_MAX_LENGTH,
  RESOLUTION_COMMENT_MAX_LENGTH,
  RESOLUTION_MAX_DESCRIPTION_LENGTH,
  RESOLUTION_MIN_DESCRIPTION_LENGTH,
  RESOLUTION_SORT_PARAM,
  RESOLUTION_STATUS,
  RESOLUTION_TYPE,
  RESOLUTION_VOTE,
  SORT_ORDER,
} from '@flact/constants';
import { ResolutionCommentEntity } from '@flact/entities';
import { ApiResponseProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { APP_TIME_ZONE } from 'config';
import moment from 'moment-timezone';
import {
  ApiPropertyArray,
  ApiPropertyBoolean,
  ApiPropertyDate,
  ApiPropertyEnum,
  ApiPropertyId,
  ApiPropertyNumber,
  ApiPropertyString,
} from '../../../decorators/properties';
import { ResponsePaginationDTO } from '../../../dtos/pagination.dto';
import { ResolutionInfo } from '../models/resolution.info.model';

export class CreateResolutionBodyDTO {
  @ApiPropertyId()
  companyId: number;

  @ApiPropertyString({ minLength: 1, maxLength: 128, example: 'resolution' })
  name: string;

  @ApiPropertyEnum(RESOLUTION_TYPE)
  type: RESOLUTION_TYPE;

  @ApiPropertyDate({ minDate: moment().tz(APP_TIME_ZONE).startOf('day').toDate() })
  votingStartDate: Date;

  @ApiPropertyDate({ minDate: new Date() })
  votingEndDate: Date;

  @ApiPropertyString({
    minLength: RESOLUTION_MIN_DESCRIPTION_LENGTH,
    maxLength: RESOLUTION_MAX_DESCRIPTION_LENGTH,
    example: 'New Resolution',
  })
  description: string;

  @ApiPropertyNumber({ min: 1, max: 100 })
  approvalRatio: number;

  @ApiPropertyArray({ type: Number })
  @ApiPropertyId({ each: true })
  documentsIds: number[];

  @ApiPropertyBoolean()
  emergency: boolean;

  // ---- XRPL extra fields ----
  @ApiPropertyString({ description: "Contract Hash" })
  contractHash: string;

  @ApiPropertyString({ description: "Payment 1 Amount" })
  payment1Amount: string;

  @ApiPropertyString({ description: "Payment 1 Currency" })
  payment1Currency: string;

  @ApiPropertyString({ description: "CheckCreate Send Max Amount" })
  checkCreateSendMaxAmount: string;

  @ApiPropertyString({ description: "CheckCreate Amount" })
  checkCreateAmount: string;

  @ApiPropertyString({ description: "CheckCreate Currency" })
  checkCreateCurrency: string;

  @ApiPropertyString({ description: "Payment 2 Amount" })
  payment2Amount: string;

  @ApiPropertyString({ description: "Payment 2 Currency" })
  payment2Currency: string;

  @ApiPropertyString({ description: "CheckCash Amount" })
  checkCashAmount: string;

  @ApiPropertyString({ description: "CheckCash Currency" })
  checkCashCurrency: string;
}

export class CreateResolutionResponseDTO {
  @ApiResponseProperty({ type: Boolean, example: true })
  @Expose()
  result: boolean;
  @ApiResponseProperty({ type: Number, example: 2 })
  @Expose()
  resolutionId: number;

  constructor(response: CreateResolutionResponseDTO) {
    Object.assign(this, response);
  }
}

export class GetResolutionResponseDTO extends ResolutionInfo {
  constructor(resolution: ResolutionInfo) {
    super();
    Object.assign(this, resolution);
  }
}

export class GetResolutionsQueryDTO {
  @ApiPropertyId({ isOptional: true })
  companyId?: number;
  @ApiPropertyId({ isOptional: true })
  cosignatoryId?: number;
  @ApiPropertyId({ isOptional: true })
  resolutionId?: number;
  @ApiPropertyString({ isOptional: true, description: 'Partial (resolution name or resolution id)' })
  resolutionIdentity?: string;
  @ApiPropertyBoolean({ isOptional: true })
  isVote?: boolean;
  @ApiPropertyArray({ isOptional: true, isUnique: true, isNotEmpty: true, type: 'enum', enumValue: RESOLUTION_TYPE })
  @ApiPropertyEnum(RESOLUTION_TYPE, { isOptional: true, each: true })
  types?: RESOLUTION_TYPE[];
  @ApiPropertyEnum(RESOLUTION_STATUS, { isOptional: true })
  status?: RESOLUTION_STATUS;
  @ApiPropertyString({ isOptional: true, description: 'Partial (company name or resolution id)' })
  searchString?: string;
  @ApiPropertyDate({ isOptional: true })
  creationDateFrom?: string;
  @ApiPropertyDate({ isOptional: true })
  creationDateTo?: string;
  @ApiPropertyDate({ isOptional: true })
  startDateFrom?: string;
  @ApiPropertyDate({ isOptional: true })
  startDateTo?: string;
  @ApiPropertyDate({ isOptional: true })
  endDateFrom?: string;
  @ApiPropertyDate({ isOptional: true })
  endDateTo?: string;
  @ApiPropertyDate({ isOptional: true })
  resolveDateFrom?: string;
  @ApiPropertyDate({ isOptional: true })
  resolveDateTo?: string;
  @ApiPropertyNumber({ isOptional: true, min: 0 })
  skip?: number = 0;
  @ApiPropertyNumber({ isOptional: true, min: 0 })
  limit?: number;
  @ApiPropertyEnum(RESOLUTION_SORT_PARAM, { isOptional: true })
  sortParam: RESOLUTION_SORT_PARAM;
  @ApiPropertyEnum(SORT_ORDER, { isOptional: true })
  sortOrder: SORT_ORDER = SORT_ORDER.DESC;
}

export class GetResolutionsResponseDTO extends ResponsePaginationDTO {
  @ApiResponseProperty({ type: [ResolutionInfo] })
  @Expose()
  @Type(() => ResolutionInfo)
  resolutionsInfo: ResolutionInfo[];

  constructor(resolutionResponse: GetResolutionsResponseDTO) {
    super();
    Object.assign(this, resolutionResponse);
  }
}
export class VoteForResolutionBodyDTO {
  @ApiPropertyId()
  resolutionId: number;

  @ApiPropertyEnum(RESOLUTION_VOTE)
  vote: RESOLUTION_VOTE;
}

class ResolutionResultDTO {
  @ApiResponseProperty({ type: Boolean, example: true })
  @Expose()
  result: boolean;

  constructor(result: boolean) {
    this.result = result;
  }
}

export class VoteForResolutionResponseDTO extends ResolutionResultDTO {
  constructor(result: boolean) {
    super(result);
  }
}

export class CancelResolutionBodyDTO {
  @ApiPropertyString({ isOptional: true, maxLength: RESOLUTION_CANCEL_REASON_MAX_LENGTH })
  cancelReason: string = '';
}

export class CancelResolutionResponseDTO extends ResolutionResultDTO {
  constructor(result: boolean) {
    super(result);
  }
}

export class EditResolutionDocumentBodyDTO {
  @ApiPropertyArray({ type: Number })
  @ApiPropertyId({ each: true })
  documentsIds: number[];
}

export class EditResolutionDocumentResponseDTO extends ResolutionResultDTO {
  constructor(result: boolean) {
    super(result);
  }
}

export class EditResolutionCommentBodyDTO {
  @ApiPropertyString({ maxLength: RESOLUTION_COMMENT_MAX_LENGTH })
  text: string;
}

export class EditResolutionCommentResponseDTO extends ResolutionCommentEntity {
  constructor(comment: ResolutionCommentEntity) {
    super(comment);
  }
}

export class DeleteResolutionCommentResponseDTO extends ResolutionCommentEntity {
  constructor(comment: ResolutionCommentEntity) {
    super(comment);
  }
}

export class GetResolutionCommentsDTO {
  @ApiResponseProperty({ type: [ResolutionCommentEntity] })
  @Expose()
  @Type(() => ResolutionCommentEntity)
  comments: ResolutionCommentEntity[];

  constructor(comments: ResolutionCommentEntity[]) {
    this.comments = comments;
  }
}
