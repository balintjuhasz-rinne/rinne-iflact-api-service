import { PAGINATION_LIMIT_DEFAULT, PAGINATION_LIMIT_MAX } from '@flact/constants';
import { ApiResponseProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { ApiPropertyNumber } from '../decorators/properties';

export class RequestPaginationDTO {
  @ApiPropertyNumber({ isOptional: true, min: 0 })
  skip: number = 0;
  @ApiPropertyNumber({ isOptional: true, min: 0, max: PAGINATION_LIMIT_MAX })
  limit: number = PAGINATION_LIMIT_DEFAULT;
}

export class ResponsePaginationDTO {
  @ApiResponseProperty({ type: Number, example: 5 })
  @Expose()
  skip: number;
  @ApiResponseProperty({ type: Number, example: 10 })
  @Expose()
  limit: number;
  @ApiResponseProperty({ type: Number, example: 30 })
  @Expose()
  count: number;
}
