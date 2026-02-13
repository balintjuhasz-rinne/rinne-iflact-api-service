import { FORM_ERRORS } from '@flact/constants';
import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiPropertyOptions } from '@nestjs/swagger/dist/decorators/api-property.decorator';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, MinDate } from 'class-validator';

export function ApiPropertyDate({ isOptional, minDate }: { isOptional?: boolean, minDate?: Date } = {}) {
  const propertyOptions: ApiPropertyOptions = { type: Date, example: new Date() };

  return applyDecorators(
    ...isOptional
      ? [IsOptional(), ApiPropertyOptional(propertyOptions)]
      : [ApiProperty(propertyOptions)],
    IsDate({ message: FORM_ERRORS.INVALID_DATE }),
    ...minDate ? [MinDate(minDate, { message: FORM_ERRORS.INVALID_LIMIT_VALUE, context: { minValue: minDate } })] : [],
    Type(() => Date),
  );
}
