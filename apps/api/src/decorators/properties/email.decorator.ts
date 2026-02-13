import { FORM_ERRORS } from '@flact/constants';
import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiPropertyOptions } from '@nestjs/swagger/dist/decorators/api-property.decorator';
import { IsEmail, IsOptional, MaxLength } from 'class-validator';

export function ApiPropertyEmail({ isOptional }: { isOptional?: boolean } = {}) {
  const propertyOptions: ApiPropertyOptions = { type: String, example: 'koko@ko.ko', description: 'Email' };

  return applyDecorators(
    ...isOptional
      ? [IsOptional(), ApiPropertyOptional(propertyOptions)]
      : [ApiProperty(propertyOptions)],
    IsEmail({}, { message: FORM_ERRORS.FIELD_INVALID_EMAIL }),
    MaxLength(256, { message: FORM_ERRORS.FIELD_INVALID_LENGTH }),
  );
}
