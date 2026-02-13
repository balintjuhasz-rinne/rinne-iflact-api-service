import { API_GROUP, HTTP_CONSTANTS, USER_ROLE } from '@flact/constants';
import { ErrorsResponse } from '@flact/exceptions';
import { Body, Controller, HttpCode, Post, Req, SerializeOptions } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from '../../auth/decorators/auth.decorator';
import { RequestWithUser } from '../../auth/dtos/request.with.user.dto';
import { CreateCosecretaryBodyDTO, CreateCosecretaryResponseDTO } from '../dtos/cosecretary.controller.dtos';
import { UserService } from '../services/user.service';

const { COMMON } = API_GROUP;

@ApiTags('cosecretaries')
@Controller('cosecretaries')
@SerializeOptions({
  groups: [COMMON],
})
export class CosecretaryController {

  constructor(
    private readonly userService: UserService,
  ) {}

  @Post('/')
  @HttpCode(HTTP_CONSTANTS.CODE.CREATED)
  @Auth(USER_ROLE.CO_SECRETARY)
  @ApiOkResponse({ type: CreateCosecretaryResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  async createCosecretary(@Body() cosecretaryBody: CreateCosecretaryBodyDTO, @Req() { user }: RequestWithUser)
    : Promise<CreateCosecretaryResponseDTO> {
    const cosecretary = await this.userService.createUser(
      {
        ...cosecretaryBody,
        role: USER_ROLE.CO_SECRETARY,
      },
      user,
    );
    return new CreateCosecretaryResponseDTO({ result: true, cosecretary });
  }
}
