import { ApiPropertyId } from '../decorators/properties';

export class IdParamDTO {
  @ApiPropertyId()
  id: number;
}
