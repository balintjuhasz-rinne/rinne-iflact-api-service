import { FORM_ERRORS } from '@flact/constants';
import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiPropertyOptions } from '@nestjs/swagger/dist/decorators/api-property.decorator';
import { Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';
import parsePhoneNumberFromString from 'libphonenumber-js';
import { IsValidPhoneNumber } from '../validators/is.phone.number.decorator';

class ApiPropertyPhoneNumberParams {
  isOptional?: boolean = false;
}

export function ApiPropertyPhoneNumber({ isOptional }: ApiPropertyPhoneNumberParams = {}) {
  const propertyOptions: ApiPropertyOptions = { type: String, example: '+37533292821320', description: 'Phone number' };

  return applyDecorators(
    ...isOptional
      ? [IsOptional(), ApiPropertyOptional(propertyOptions)]
      : [ApiProperty(propertyOptions)],
    IsValidPhoneNumber({ message: FORM_ERRORS.INVALID_PHONE_NUMBER }),
    Transform(({ value }) =>
      value && typeof value === 'string' && parsePhoneNumberFromString(value)
        ? parsePhoneNumberFromString(value).format('E.164')
        : value,
    ),
  );
}
