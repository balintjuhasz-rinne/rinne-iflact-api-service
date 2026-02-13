import { DEFAULT_RANDOM_TOKEN_BYTE_SIZE, TOKEN_ERRORS } from '@flact/constants';
import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsByteLength, IsHexadecimal, IsOptional } from 'class-validator';

class PropertyHashParams {
  isOptional?: boolean = false;
  length?: number = DEFAULT_RANDOM_TOKEN_BYTE_SIZE * 2;
}

export function ApiPropertyHash({ isOptional, length }: PropertyHashParams = {}) {
  return applyDecorators(
    ...isOptional
      ? [IsOptional(), ApiPropertyOptional()]
      : [ApiProperty()],
    IsHexadecimal({ message: TOKEN_ERRORS.INVALID_TOKEN }),
    IsByteLength(length, length, { message: TOKEN_ERRORS.INVALID_TOKEN }),
  );
}
