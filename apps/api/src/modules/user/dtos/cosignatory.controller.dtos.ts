import { FORM_ERRORS, SORT_ORDER, USER_COMMENT_MAX_LENGTH, USER_POSITION, USER_SORT_PARAM, USER_STATUS } from '@flact/constants';
import { UserCommentEntity, UserEntity, UserMessageEntity, UserWorkplaceEntity } from '@flact/entities';
import { ApiResponseProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { IsEnum, ValidateIf, ValidateNested } from 'class-validator';
import {
  ApiPropertyArray,
  ApiPropertyBoolean,
  ApiPropertyEmail,
  ApiPropertyEnum,
  ApiPropertyFloat,
  ApiPropertyId,
  ApiPropertyPhoneNumber,
  ApiPropertyString,
} from '../../../decorators/properties';
import { IdParamDTO } from '../../../dtos/id.param.dto';
import { RequestPaginationDTO, ResponsePaginationDTO } from '../../../dtos/pagination.dto';
import { GetUserMessagesQueryDTO } from './user.controller.dto';

export class CosignatoryWorkplaceDTO {
  @ApiPropertyId()
  companyId: number;
  @ApiPropertyArray({ type: 'enum', enumValue: USER_POSITION, isNotEmpty: true, isUnique: true })
  @IsEnum(USER_POSITION, { message: FORM_ERRORS.FIELD_MUST_BE_AN_ENUM, context: USER_POSITION, each: true })
  positions: USER_POSITION[];
  @ValidateIf(object => object.positions?.includes(USER_POSITION.SHARE_HOLDER))
  @ApiPropertyFloat({ min: 0.01, max: 100, maxDecimalPlaces: 2 })
  @Transform(({ value, obj }) => obj.positions?.includes(USER_POSITION.SHARE_HOLDER) ? value : null)
  votingValue: number = null;
  @ValidateIf(object => object.positions?.includes(USER_POSITION.SHARE_HOLDER))
  @ApiPropertyBoolean()
  @Transform(({ value, obj }) => obj.positions?.includes(USER_POSITION.SHARE_HOLDER) ? value : false)
  vetoPower: boolean = undefined;
}

export class CreateCosignatoryBodyDTO {
  @ApiPropertyString({ minLength: 1, maxLength: 128, example: 'Nick' })
  name: string;
  @ApiPropertyString({ isOptional: true, minLength: 1, maxLength: 128, example: 'Borovsky' })
  surname: string;
  @ApiPropertyArray({ type: CosignatoryWorkplaceDTO, isNotEmpty: true })
  @ValidateNested({ each: true })
  @Type(() => CosignatoryWorkplaceDTO)
  workplaces: CosignatoryWorkplaceDTO[];
  @ApiPropertyPhoneNumber({ isOptional: true })
  phoneNumber: string;
  @ApiPropertyEmail()
  email: string;
  @ApiPropertyString({ isOptional: true })
  personalId: string;
  @ApiPropertyString({ isOptional: true })
  correspondenceAddress: string;
  @ApiPropertyString({ isOptional: true })
  residentialAddress: string;
}

export class CreateCosignatoryResponseDTO extends UserEntity {
  constructor(user: UserEntity) {
    super(user);
    Object.assign(this, user);
  }
}

export class UpdateCosignatoryBodyDTO {
  @ApiPropertyString({ isOptional: true, minLength: 1, maxLength: 128, example: 'Nick' })
  name: string;
  @ApiPropertyString({ isOptional: true, minLength: 1, maxLength: 128, example: 'Borovsky' })
  surname: string;
  @ApiPropertyPhoneNumber({ isOptional: true })
  phoneNumber: string;
  @ApiPropertyString({ isOptional: true })
  personalId: string;
  @ApiPropertyArray({ isOptional: true, type: CosignatoryWorkplaceDTO, isNotEmpty: true })
  @ValidateNested({ each: true })
  @Type(() => CosignatoryWorkplaceDTO)
  workplaces: CosignatoryWorkplaceDTO[];
  @ApiPropertyString({ isOptional: true })
  correspondenceAddress: string;
  @ApiPropertyString({ isOptional: true })
  residentialAddress: string;
}

export class UpdateCosignatoryResponseDTO extends UserEntity {
  constructor(user: UserEntity) {
    super(user);
    Object.assign(this, user);
  }
}

export class AddCosignatoryWorkplacesBodyDTO {
  @ApiPropertyArray({ type: CosignatoryWorkplaceDTO, isNotEmpty: true })
  @ValidateNested({ each: true })
  @Type(() => CosignatoryWorkplaceDTO)
  workplaces: CosignatoryWorkplaceDTO[];
}

export class AddCosignatoryWorkplacesResponseDTO {
  @Expose()
  @Type(() => UserWorkplaceEntity)
  workplaces: UserWorkplaceEntity[];

  constructor(workplaces: UserWorkplaceEntity[]) {
    this.workplaces = workplaces;
  }
}

export class GetCosignatoriesQueryDTO extends RequestPaginationDTO {
  @ApiPropertyString({ isOptional: true })
  name: string;
  @ApiPropertyId({ isOptional: true })
  companyId?: number;
  @ApiPropertyEnum(USER_STATUS, { isOptional: true })
  status?: USER_STATUS;
  @ApiPropertyEnum(USER_SORT_PARAM, { isOptional: true })
  sortParam: USER_SORT_PARAM;
  @ApiPropertyEnum(SORT_ORDER, { isOptional: true })
  sortOrder: SORT_ORDER = SORT_ORDER.ASC;
}

export class GetCosignatoriesResponseDTO extends ResponsePaginationDTO {
  @ApiResponseProperty({ type: [UserEntity] })
  @Type(() => UserEntity)
  @Expose()
  cosignatories: UserEntity[];

  constructor(data: GetCosignatoriesResponseDTO) {
    super();
    Object.assign(this, data);
  }
}

export class GetCosignatoryResponseDTO extends UserEntity {
  constructor(user: UserEntity) {
    super(user);
    Object.assign(this, user);
  }
}

export class GetCosignatoriesEmailsResponseDTO {
  @ApiResponseProperty({ type: [UserEntity] })
  @Type(() => UserEntity)
  @Expose()
  cosignatories: UserEntity[];

  constructor(cosignatories: UserEntity[]) {
    this.cosignatories = cosignatories;
  }
}

export class DeleteCosignatoryResponseDTO {
  @ApiResponseProperty()
  @Expose()
  result: boolean;
  @ApiResponseProperty({ type: UserEntity })
  @Type(() => UserEntity)
  @Expose()
  cosignatory: UserEntity;

  constructor(data: DeleteCosignatoryResponseDTO) {
    Object.assign(this, data);
  }
}

export class GetCosignatoryMessagesQueryDTO extends GetUserMessagesQueryDTO {}

export class GetCosignatoryMessagesResponseDTO {
  @ApiResponseProperty({ type: [UserMessageEntity] })
  @Expose()
  @Type(() => UserMessageEntity)
  messages: UserMessageEntity[];

  constructor(messages: UserMessageEntity[]) {
    this.messages = messages;
  }
}

export class ResendCosignatoryMessageParamDTO extends IdParamDTO {
  @ApiPropertyId()
  messageId: number;
}

export class ResendCosignatoryMessageResponseDTO extends UserMessageEntity {
  constructor(message: UserMessageEntity) {
    super(message);
  }
}

export class EditCosignatoryCommentBodyDTO {
  @ApiPropertyString({ maxLength: USER_COMMENT_MAX_LENGTH, example: 'My first comment' })
  text: string;
}

export class EditCosignatoryCommentResponseDTO extends UserCommentEntity {
  constructor(comment: UserCommentEntity) {
    super(comment);
  }
}

export class DeleteCosignatoryCommentResponseDTO extends UserCommentEntity {
  constructor(comment: UserCommentEntity) {
    super(comment);
  }
}

export class EditCosignatoryStatusBodyDTO {
  @ApiPropertyEnum(USER_STATUS)
  status: USER_STATUS;
}

export class EditCosignatoryStatusResponseDTO extends UserEntity {
  constructor(user: UserEntity) {
    super(user);
  }
}

