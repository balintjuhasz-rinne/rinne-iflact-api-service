import { API_GROUP, FORBIDDEN_ERROR, HTTP_CONSTANTS, USER_ROLE } from '@flact/constants';
import { ErrorsResponse, ForbiddenError } from '@flact/exceptions';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Put,
  Query,
  Req,
  SerializeOptions,
} from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { IdParamDTO } from '../../../dtos/id.param.dto';
import { toPlain } from '../../../helpers';
import { Auth } from '../../auth/decorators/auth.decorator';
import { RequestWithUser } from '../../auth/dtos/request.with.user.dto';
import {
  ChangeMyPasswordBodyDTO,
  ChangeMyPasswordResponseDTO,
  DeleteMeResponseDTO,
  GetMyMessagesResponseDTO,
  GetUserByTokenResponseDTO,
  GetUserColleaguesResponseDTO,
  GetUserLogsQueryDTO,
  GetUserLogsResponseDTO,
  GetUserMessagesQueryDTO,
  JwtTokenParamDTO,
  MeResponseDTO,
  UpdateMeBodyDTO,
  UpdateMeResponseDTO,
  UpdateMyNotificationsBodyDTO,
  UpdateMyNotificationsResponseDTO,
} from '../dtos/user.controller.dto';
import { CosignatoryService } from '../services/cosignatory.service';
import { UserService } from '../services/user.service';

const { COMMON, COSEC_FULL, COSEC, COMMON_FULL } = API_GROUP;

@ApiTags('users')
@Controller('users')
@SerializeOptions({
  groups: [COMMON],
})
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly cosignatoryService: CosignatoryService,
  ) {}

  @Get('/me')
  @Auth(USER_ROLE.CO_SECRETARY, USER_ROLE.CO_SIGNATORY)
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @ApiOkResponse({ type: MeResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  @SerializeOptions({
    groups: [COMMON, COMMON_FULL, COSEC, COSEC_FULL],
  })
  async getMe(@Req() { user }: RequestWithUser): Promise<MeResponseDTO> {
    return new MeResponseDTO(await this.userService.getMe(user.id, user.allianceId));
  }

  @Patch('/me')
  @Auth(USER_ROLE.CO_SECRETARY, USER_ROLE.CO_SIGNATORY)
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @ApiOkResponse({ type: UpdateMeResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  @SerializeOptions({
    groups: [COMMON, COMMON_FULL, COSEC, COSEC_FULL],
  })
  async updateMe(@Body() updateDto: UpdateMeBodyDTO, @Req() { user }: RequestWithUser): Promise<UpdateMeResponseDTO> {
    const userInfo = await this.userService.updateMe(user, updateDto);
    return new UpdateMeResponseDTO({ result: true, user: userInfo });
  }

  @Put('/me/notifications')
  @Auth(USER_ROLE.CO_SECRETARY, USER_ROLE.CO_SIGNATORY)
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @ApiOkResponse({ type: UpdateMyNotificationsResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  @SerializeOptions({
    groups: [COMMON, COMMON_FULL],
  })
  async updateMyNotifications(@Body() notifications: UpdateMyNotificationsBodyDTO, @Req() { user }: RequestWithUser): Promise<UpdateMyNotificationsResponseDTO> {
    await this.userService.updateUserNotifications(user, notifications);
    return new UpdateMyNotificationsResponseDTO(true);
  }

  @Delete('/me')
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @Auth(USER_ROLE.CO_SIGNATORY)
  @ApiOkResponse({ type: DeleteMeResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  @SerializeOptions({
    groups: [COMMON, COSEC],
  })
  async deleteMe(@Req() { user }: RequestWithUser): Promise<DeleteMeResponseDTO> {
    const cosignatory = await this.cosignatoryService.deleteCosignatoryWithoutResolutions(user.id, user.allianceId);
    return new DeleteMeResponseDTO({ result: true, user: cosignatory });
  }

  @Get('/me/messages')
  @Auth(USER_ROLE.CO_SECRETARY, USER_ROLE.CO_SIGNATORY)
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @ApiOkResponse({ type: GetMyMessagesResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  async getMyMessages(@Query() filters: GetUserMessagesQueryDTO, @Req() { user }: RequestWithUser): Promise<GetMyMessagesResponseDTO> {
    const messages = await this.userService.getUserMessages(user.id, filters, user.allianceId);
    return new GetMyMessagesResponseDTO(messages);
  }

  @Get('/by-token/:token')
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @ApiOkResponse({ type: GetUserByTokenResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  @SerializeOptions({
    groups: [COMMON, COMMON_FULL, COSEC, COSEC_FULL],
  })
  async getUserByToken(@Param() { token }: JwtTokenParamDTO): Promise<GetUserByTokenResponseDTO> {
    return new GetUserByTokenResponseDTO(await this.userService.getUserByToken(token));
  }

  @Patch('/me/password')
  @Auth(USER_ROLE.CO_SECRETARY, USER_ROLE.CO_SIGNATORY)
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @ApiOkResponse({ type: ChangeMyPasswordResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  async changeMyPassword(@Body() {
    oldPassword,
    newPassword,
  }: ChangeMyPasswordBodyDTO, @Req() { user }: RequestWithUser): Promise<ChangeMyPasswordResponseDTO> {
    await this.userService.changePassword(oldPassword, newPassword, user);
    return new ChangeMyPasswordResponseDTO(true);
  }

  @Get('/:id/logs')
  @Auth(USER_ROLE.CO_SECRETARY, USER_ROLE.CO_SIGNATORY)
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @ApiOkResponse({ type: GetUserLogsResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  async getUserLogs(@Param() { id }: IdParamDTO, @Query() logFilters: GetUserLogsQueryDTO, @Req() { user }: RequestWithUser): Promise<GetUserLogsResponseDTO> {
    if (user.role === USER_ROLE.CO_SIGNATORY && id !== user.id) {
      throw new ForbiddenError([{ field: 'id', message: FORBIDDEN_ERROR }]);
    }
    const logsDto = new GetUserLogsResponseDTO(await this.userService.getUserLogs(id, logFilters, user.allianceId));
    return toPlain(logsDto, { role: user.role });
  }

  @Get('/:id/colleagues')
  @Auth(USER_ROLE.CO_SECRETARY, USER_ROLE.CO_SIGNATORY)
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @ApiOkResponse({ type: GetUserColleaguesResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  async getUserColleagues(@Param() { id }: IdParamDTO, @Req() { user }: RequestWithUser): Promise<GetUserColleaguesResponseDTO> {
    const colleagues = new GetUserColleaguesResponseDTO(await this.userService.getUserColleagues(id, user));

    return toPlain(colleagues, { role: user.role, isFull: true });
  }
}
