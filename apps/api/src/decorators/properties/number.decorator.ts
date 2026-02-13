import { FORM_ERRORS } from '@flact/constants';
import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiPropertyOptions } from '@nestjs/swagger/dist/decorators/api-property.decorator';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

class ApiPropertyNumberParams {
  isOptional?: boolean;
  min?: number;
  max?: number;
  each?: boolean;
}

export function ApiPropertyNumber({ isOptional, min, max, each }: ApiPropertyNumberParams = {}) {
  const propertyOptions: ApiPropertyOptions = {
    type: Number,
    example: each ? [1, 2, 3] : 1,
    isArray: each,
    ...min ? [{ minimum: min }] : [],
    ...max ? [{ maximum: max }] : [],
  };

  return applyDecorators(
    ...isOptional
      ? [IsOptional(), ApiPropertyOptional(propertyOptions)]
      : [ApiProperty(propertyOptions)],
    IsInt({ message: FORM_ERRORS.FIELD_MUST_BE_AN_INTEGER, each }),
    Type(() => Number),
    ...!isNaN(min) ? [Min(min, { message: FORM_ERRORS.INVALID_LIMIT_VALUE, context: { minValue: min }, each })] : [],
    ...!isNaN(max) ? [Max(max, { message: FORM_ERRORS.INVALID_LIMIT_VALUE, context: { maxValue: max }, each })] : [],
  );
}
