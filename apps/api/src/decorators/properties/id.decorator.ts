import { MAX_DB_INTEGER } from '@flact/constants';
import { ApiPropertyNumber } from './number.decorator';

export function ApiPropertyId({ isOptional, each }: { isOptional?: boolean, each?: boolean } = {}) {
  return ApiPropertyNumber({ isOptional, min: 1, max: MAX_DB_INTEGER, each });
}
