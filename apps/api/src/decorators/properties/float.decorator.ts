import { FORM_ERRORS } from '@flact/constants';
import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiPropertyOptions } from '@nestjs/swagger/dist/decorators/api-property.decorator';
import { Type } from 'class-transformer';
import { isDefined, IsNumber, IsOptional, Max, Min } from 'class-validator';

class ApiPropertyFloatParams {
  isOptional?: boolean;
  min?: number;
  max?: number;
  each?: boolean;
  maxDecimalPlaces?: number;
}

export function ApiPropertyFloat({ isOptional, maxDecimalPlaces, min, max, each }: ApiPropertyFloatParams = {}) {
  const propertyOptions: ApiPropertyOptions = {
    type: Number,
    example: each ? [1, 2.2, 3] : 1.2,
    isArray: each,
    ...min ? [{ minimum: min }] : [],
    ...max ? [{ maximum: max }] : [],
  };

  const decimalPlaces = { ...isDefined(maxDecimalPlaces) && { maxDecimalPlaces } };
  return applyDecorators(
    ...isOptional
      ? [IsOptional(), ApiPropertyOptional(propertyOptions)]
      : [ApiProperty(propertyOptions)],
    IsNumber({ ...decimalPlaces }, { message: FORM_ERRORS.FIELD_INVALID_NUMBER, each, context: { ...decimalPlaces } }),
    Type(() => Number),
    ...!isNaN(min) ? [Min(min, { message: FORM_ERRORS.INVALID_LIMIT_VALUE, context: { minValue: min }, each })] : [],
    ...!isNaN(max) ? [Max(max, { message: FORM_ERRORS.INVALID_LIMIT_VALUE, context: { maxValue: max }, each })] : [],
  );
}
