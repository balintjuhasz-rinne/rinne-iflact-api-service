import { TOKEN_ERRORS } from '@flact/constants';
import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsJWT, IsOptional } from 'class-validator';

class PropertyHashParams {
  isOptional?: boolean;
}

export function ApiPropertyJwt({ isOptional }: PropertyHashParams = {}) {
  return applyDecorators(
    ...isOptional
      ? [IsOptional(), ApiPropertyOptional({ type: String })]
      : [ApiProperty({ type: String })],
    IsJWT({ message: TOKEN_ERRORS.INVALID_TOKEN }),
  );
}
