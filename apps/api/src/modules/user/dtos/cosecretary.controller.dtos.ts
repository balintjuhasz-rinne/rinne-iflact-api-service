import { UserEntity } from '@flact/entities';
import { ApiResponseProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { ApiPropertyArray, ApiPropertyEmail, ApiPropertyId, ApiPropertyPhoneNumber, ApiPropertyString } from '../../../decorators/properties';

export class CosecretaryWorkplaceDTO {
  @ApiPropertyId()
  companyId: number;
}

export class CreateCosecretaryBodyDTO {
  @ApiPropertyString({ minLength: 1, maxLength: 128, example: 'Nick' })
  name: string;
  @ApiPropertyString({ minLength: 1, maxLength: 128, example: 'Borovsky' })
  surname: string;
  @ApiPropertyEmail()
  email: string;
  @ApiPropertyString({ minLength: 1, maxLength: 128, example: 'Cosec' })
  cosecPosition: string;
  @ApiPropertyPhoneNumber()
  phoneNumber: string;
  @ApiPropertyArray({ type: CosecretaryWorkplaceDTO, isNotEmpty: true })
  @ValidateNested({ each: true })
  @Type(() => CosecretaryWorkplaceDTO)
  workplaces: CosecretaryWorkplaceDTO[];
  @ApiPropertyString({ isOptional: true })
  personalId: string;
}

export class CreateCosecretaryResponseDTO {
  @ApiResponseProperty()
  @Expose()
  result: boolean;
  @ApiResponseProperty()
  @Expose()
  @Type(() => UserEntity)
  cosecretary: UserEntity;

  constructor(cosecretary: Partial<CreateCosecretaryResponseDTO>) {
    Object.assign(this, cosecretary);
  }
}
