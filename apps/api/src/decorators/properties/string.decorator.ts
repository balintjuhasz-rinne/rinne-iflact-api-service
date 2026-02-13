import { FORM_ERRORS } from '@flact/constants';
import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiPropertyOptions } from '@nestjs/swagger/dist/decorators/api-property.decorator';
import { IsOptional, MaxLength, MinLength } from 'class-validator';

class PropertyStringParams {
  isOptional?: boolean;
  minLength?: number;
  maxLength?: number;
  example?: string;
  description?: string;
}

export function ApiPropertyString({ isOptional, minLength = 0, maxLength, description, example = 'some string' }: PropertyStringParams = {}) {
  const propertyOptions: ApiPropertyOptions = {
    type: String,
    example,
    minLength,
    description,
    ...!isNaN(maxLength) ? [{ maxLength }] : [],
  };

  return applyDecorators(
    ...isOptional
      ? [IsOptional(), ApiPropertyOptional(propertyOptions)]
      : [ApiProperty(propertyOptions)],
    MinLength(minLength, { message: FORM_ERRORS.FIELD_INVALID_LENGTH, context: { minLength } }),
    ...!isNaN(maxLength)
      ? [MaxLength(maxLength, { message: FORM_ERRORS.FIELD_INVALID_LENGTH, context: { maxLength } })]
      : [],
  );
}
