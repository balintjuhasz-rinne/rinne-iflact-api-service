import { FORM_ERRORS } from '@flact/constants';
import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiPropertyOptions } from '@nestjs/swagger/dist/decorators/api-property.decorator';
import { IsEnum, IsOptional } from 'class-validator';

export function ApiPropertyEnum(type: any, { isOptional, each }: { isOptional?: boolean, each?: boolean } = {}) {
  const propertyOptions: ApiPropertyOptions = { type: 'enum', enum: type };

  return applyDecorators(
    ...isOptional
      ? [IsOptional(), ApiPropertyOptional(propertyOptions)]
      : [ApiProperty(propertyOptions)],
    IsEnum(type, { message: FORM_ERRORS.FIELD_MUST_BE_AN_ENUM, context: Object.values(type), each }),
  );
}
