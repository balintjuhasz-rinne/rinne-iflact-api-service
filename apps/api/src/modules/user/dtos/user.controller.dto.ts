import { MESSAGE_DELIVERY, MESSAGE_TYPE } from '@flact/constants';
import { UserEntity, UserLogEntity, UserMessageEntity } from '@flact/entities';
import { ApiProperty, ApiResponseProperty } from '@nestjs/swagger';
import { ApiResponseModelProperty } from '@nestjs/swagger/dist/decorators/api-model-property.decorator';
import { Expose, Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import {
  ApiPropertyArray,
  ApiPropertyBoolean,
  ApiPropertyDate,
  ApiPropertyEnum,
  ApiPropertyId,
  ApiPropertyNumber,
  ApiPropertyPassword,
  ApiPropertyPhoneNumber,
  ApiPropertyString,
} from '../../../decorators/properties';

export class MeResponseDTO extends UserEntity {
  constructor(userInfo: UserEntity) {
    super(userInfo);
    Object.assign(this, userInfo);
  }
}

export class GetUserMessagesQueryDTO {
  @ApiPropertyNumber({ isOptional: true })
  resolutionId: number;
  @ApiPropertyEnum(MESSAGE_TYPE, { isOptional: true })
  type: MESSAGE_TYPE;
  @ApiPropertyDate({ isOptional: true })
  startDate: string;
  @ApiPropertyDate({ isOptional: true })
  endDate: string;
}

export class GetMyMessagesResponseDTO {
  @ApiResponseProperty({ type: [UserMessageEntity] })
  @Expose()
  @Type(() => UserMessageEntity)
  messages: UserMessageEntity[];

  constructor(messages: UserMessageEntity[]) {
    this.messages = messages;
  }
}

export class JwtTokenParamDTO {
  @ApiPropertyString()
  token: string;
}

export class GetUserByTokenResponseDTO extends UserEntity {
  constructor(user: UserEntity) {
    super(user);
    Object.assign(this, user);
  }
}

export class DeleteMeResponseDTO {
  @ApiResponseProperty()
  @Expose()
  result: boolean;
  @ApiResponseProperty({ type: UserEntity })
  @Type(() => UserEntity)
  @Expose()
  user: UserEntity;

  constructor(data: DeleteMeResponseDTO) {
    Object.assign(this, data);
  }
}

export class UpdateMeBodyDTO {
  @ApiPropertyString({ isOptional: true, minLength: 1, maxLength: 128, example: 'Nick' })
  name: string;
  @ApiPropertyString({ isOptional: true, minLength: 1, maxLength: 128, example: 'Borovsky' })
  surname: string;
  @ApiPropertyString({ isOptional: true, maxLength: 128, example: 'Boss' })
  cosecPosition: string;
  @ApiPropertyPhoneNumber({ isOptional: true })
  phoneNumber: string;
  @ApiPropertyId({ isOptional: true })
  avatarId: number;
  @ApiPropertyString({ isOptional: true })
  personalId: string;
  @ApiPropertyString({ isOptional: true })
  correspondenceAddress: string;
  @ApiPropertyString({ isOptional: true })
  residentialAddress: string;
}

export class UpdateMeResponseDTO {
  @ApiResponseProperty()
  @Expose()
  result: boolean;
  @ApiResponseProperty()
  @Expose()
  @Type(() => UserEntity)
  user: UserEntity;

  constructor(data: UpdateMeResponseDTO) {
    Object.assign(this, data);
  }
}

export class UserNotification {
  @ApiPropertyBoolean()
  enabled: boolean;
  @ApiPropertyEnum(MESSAGE_DELIVERY)
  delivery: MESSAGE_DELIVERY;
  @ApiPropertyBoolean()
  event: boolean;
  @ApiProperty()
  @ApiPropertyNumber({ min: 0, max: 365 })
  beforeIncorporation: number;
  @ApiPropertyNumber({ min: 0, max: 365 })
  beforeFinancialYearEnd: number;
  @ApiPropertyNumber({ min: 0, max: 365 })
  beforeAnniversaryOfLastAgm: number;
}

export class UpdateMyNotificationsBodyDTO {
  @ApiPropertyArray({ type: UserNotification, isNotEmpty: true, maxSize: Object.values(MESSAGE_DELIVERY).length })
  @ValidateNested({ each: true })
  @Type(() => UserNotification)
  notifications: UserNotification[];
}

export class UpdateMyNotificationsResponseDTO {
  @ApiResponseProperty()
  @Expose()
  result: boolean;

  constructor(result: boolean) {
    this.result = result;
  }
}

export class ChangeMyPasswordBodyDTO {
  @ApiPropertyPassword()
  oldPassword: string;
  @ApiPropertyPassword()
  newPassword: string;
}

export class ChangeMyPasswordResponseDTO {
  @ApiResponseProperty()
  @Expose()
  result: boolean;

  constructor(result: boolean) {
    this.result = result;
  }
}

export class GetUserLogsQueryDTO {
  @ApiPropertyString({ isOptional: true })
  name: string;
  @ApiPropertyDate({ isOptional: true })
  startDate: string;
  @ApiPropertyDate({ isOptional: true })
  endDate: string;
}

export class GetUserLogsResponseDTO {
  @ApiResponseProperty({ type: [UserLogEntity] })
  @Expose()
  @Type(() => UserLogEntity)
  logs: UserLogEntity[];

  constructor(logs: UserLogEntity[]) {
    this.logs = logs;
  }
}

export class GetUserColleaguesResponseDTO {
  @ApiResponseModelProperty({ type: UserEntity })
  @Expose()
  @Type(() => UserEntity)
  users: UserEntity[];

  constructor(users: UserEntity[]) {
    this.users = users;
  }
}

