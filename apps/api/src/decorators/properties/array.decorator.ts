import { FORM_ERRORS } from '@flact/constants';
import { applyDecorators, Type } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiPropertyOptions } from '@nestjs/swagger/dist/decorators/api-property.decorator';
import { ArrayMaxSize, ArrayNotEmpty, ArrayUnique, IsArray, isDefined, IsOptional } from 'class-validator';

class PropertyArrayParams {
  isOptional?: boolean;
  isNotEmpty?: boolean;
  isUnique?: boolean;
  type: Type<unknown> | string | Record<string, any>;
  enumValue?: any[] | Record<string, any>;
  maxSize?: number;
}

export function ApiPropertyArray({ isOptional, isNotEmpty, isUnique, type, enumValue, maxSize }: PropertyArrayParams) {
  const propertyOptions: ApiPropertyOptions = {
    isArray: true,
    type,
    ...(enumValue && { enum: enumValue }),
  };

  return applyDecorators(
    ...isOptional
      ? [IsOptional(), ApiPropertyOptional(propertyOptions)]
      : [ApiProperty(propertyOptions)],
    IsArray({ message: FORM_ERRORS.FIELD_MUST_BE_AN_ARRAY }),
    ...isNotEmpty ? [ArrayNotEmpty({ message: FORM_ERRORS.ARRAY_EMPTY })] : [],
    ...isUnique ? [ArrayUnique({ message: FORM_ERRORS.ARRAY_MUST_BE_UNIQUE })] : [],
    ...isDefined(maxSize)
      ? [ArrayMaxSize(maxSize, { message: FORM_ERRORS.ARRAY_INVALID_SIZE, context: { maxSize } })]
      : [],
  );
}
