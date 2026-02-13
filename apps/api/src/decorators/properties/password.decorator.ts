import { FORM_ERRORS, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@flact/constants';
import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { ApiPropertyOptions } from '@nestjs/swagger/dist/decorators/api-property.decorator';
import { Transform } from 'class-transformer';
import { MaxLength, MinLength } from 'class-validator';

export function ApiPropertyPassword() {
  const propertyOptions: ApiPropertyOptions = {
    type: String,
    example: 'Abracadabra1234',
    minLength: MIN_PASSWORD_LENGTH,
    maxLength: MAX_PASSWORD_LENGTH,
  };

  return applyDecorators(
    ApiProperty(propertyOptions),
    MinLength(MIN_PASSWORD_LENGTH, { message: FORM_ERRORS.FIELD_INVALID_LENGTH, context: { MIN_PASSWORD_LENGTH } }),
    MaxLength(MAX_PASSWORD_LENGTH, { message: FORM_ERRORS.FIELD_INVALID_LENGTH, context: { MAX_PASSWORD_LENGTH } }),
    Transform(({ value }) => value && value.trim()),
  );
}
