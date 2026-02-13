import { FORM_ERRORS } from '@flact/constants';
import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiPropertyOptions } from '@nestjs/swagger/dist/decorators/api-property.decorator';
import { Transform } from 'class-transformer';
import { isBoolean, IsBoolean, isBooleanString, isNumberString, IsOptional } from 'class-validator';

export function ApiPropertyBoolean({ isOptional }: { isOptional?: boolean } = {}) {
  const propertyOptions: ApiPropertyOptions = { type: Boolean, example: true };

  return applyDecorators(
    ...isOptional
      ? [IsOptional(), ApiPropertyOptional(propertyOptions)]
      : [ApiProperty(propertyOptions)],
    IsBoolean({ message: FORM_ERRORS.FIELD_INVALID_VALUE }),
    Transform(({ value }) => (!isNumberString(value) && (isBooleanString(value) || isBoolean(value))) ? (value === 'true' || value === true) : value),
  );
}
