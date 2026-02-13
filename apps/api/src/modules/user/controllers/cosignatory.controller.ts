import { API_GROUP, HTTP_CONSTANTS, USER_ROLE } from '@flact/constants';
import { ErrorsResponse } from '@flact/exceptions';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
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
  AddCosignatoryWorkplacesBodyDTO,
  AddCosignatoryWorkplacesResponseDTO,
  CreateCosignatoryBodyDTO,
  CreateCosignatoryResponseDTO,
  DeleteCosignatoryCommentResponseDTO,
  DeleteCosignatoryResponseDTO,
  EditCosignatoryCommentBodyDTO,
  EditCosignatoryCommentResponseDTO,
  EditCosignatoryStatusBodyDTO,
  EditCosignatoryStatusResponseDTO,
  GetCosignatoriesEmailsResponseDTO,
  GetCosignatoriesQueryDTO,
  GetCosignatoriesResponseDTO,
  GetCosignatoryMessagesQueryDTO,
  GetCosignatoryMessagesResponseDTO,
  GetCosignatoryResponseDTO,
  ResendCosignatoryMessageParamDTO,
  ResendCosignatoryMessageResponseDTO,
  UpdateCosignatoryBodyDTO,
  UpdateCosignatoryResponseDTO,
} from '../dtos/cosignatory.controller.dtos';
import { CosignatoryService } from '../services/cosignatory.service';
import { UserMessageService } from '../services/user.message.service';
import { UserService } from '../services/user.service';

const { COMMON, COSEC_FULL, COSEC, COMMON_FULL } = API_GROUP;

@ApiTags('cosignatories')
@Controller('cosignatories')
@SerializeOptions({
  groups: [COMMON],
})
export class CosignatoryController {
  constructor(
    private readonly cosignatoryService: CosignatoryService,
    private readonly userService: UserService,
    private readonly userMessageService: UserMessageService,
  ) {
  }

  @Get('/')
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @Auth(USER_ROLE.CO_SECRETARY)
  @ApiOkResponse({ type: GetCosignatoriesResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  @SerializeOptions({
    groups: [COMMON, COSEC],
  })
  async getCosignatories(@Query() filters: GetCosignatoriesQueryDTO, @Req() { user }: RequestWithUser): Promise<GetCosignatoriesResponseDTO> {
    return this.cosignatoryService.getCosignatories(filters, user.allianceId);
  }

  @Get('/:id')
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @Auth(USER_ROLE.CO_SECRETARY)
  @ApiOkResponse({ type: GetCosignatoryResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  @SerializeOptions({
    groups: [COMMON, COMMON_FULL, COSEC, COSEC_FULL],
  })
  async getCosignatory(@Param() { id }: IdParamDTO, @Req() { user }: RequestWithUser): Promise<GetCosignatoryResponseDTO> {
    const [cosignatory, workplaces] = await this.cosignatoryService.getCosignatory(id, user);

    return new GetCosignatoryResponseDTO({ ...cosignatory, workplaces: toPlain(workplaces, { isFull: false }) });
  }

  @Get('/partial/emails')
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @Auth(USER_ROLE.CO_SECRETARY)
  @ApiOkResponse({ type: GetCosignatoriesEmailsResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  async getCosignatoriesEmails(@Req() { user }: RequestWithUser): Promise<GetCosignatoriesEmailsResponseDTO> {
    return new GetCosignatoriesEmailsResponseDTO(await this.cosignatoryService.getCosignatoriesEmails(user.allianceId));
  }

  @Post('/')
  @HttpCode(HTTP_CONSTANTS.CODE.CREATED)
  @Auth(USER_ROLE.CO_SECRETARY)
  @ApiOkResponse({ type: CreateCosignatoryResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  @SerializeOptions({
    groups: [COMMON, COMMON_FULL, COSEC, COSEC_FULL],
  })
  async createCosignatory(@Body() cosignatoryDTO: CreateCosignatoryBodyDTO, @Req() { user }: RequestWithUser)
    : Promise<CreateCosignatoryResponseDTO> {
    const workplaces = cosignatoryDTO.workplaces.map(workplace => ({
      ...workplace,
      positions: workplace.positions.map(position => ({ name: position })),
    }));

    const cosignatory = await this.userService.createUser(
      { ...cosignatoryDTO, workplaces, role: USER_ROLE.CO_SIGNATORY },
      user,
    );

    return new CreateCosignatoryResponseDTO(cosignatory);
  }

  @Patch('/:id')
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @Auth(USER_ROLE.CO_SECRETARY)
  @ApiOkResponse({ type: UpdateCosignatoryResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  @SerializeOptions({
    groups: [COMMON, COMMON_FULL, COSEC, COSEC_FULL],
  })
  async updateCosignatory(
    @Param() { id }: IdParamDTO,
      @Body() cosignatoryUpdateDto: UpdateCosignatoryBodyDTO,
      @Req() { user }: RequestWithUser,
  ): Promise<UpdateCosignatoryResponseDTO> {
    return new UpdateCosignatoryResponseDTO(await this.cosignatoryService.updateCosignatory(id, cosignatoryUpdateDto, user));
  }

  @Post('/:id/workplaces')
  @HttpCode(HTTP_CONSTANTS.CODE.CREATED)
  @Auth(USER_ROLE.CO_SECRETARY)
  @ApiOkResponse({ type: AddCosignatoryWorkplacesResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  async addCosignatoryWorkplaces(@Param() { id }: IdParamDTO, @Body() workplacesDTO: AddCosignatoryWorkplacesBodyDTO, @Req() { user }: RequestWithUser)
    : Promise<AddCosignatoryWorkplacesResponseDTO> {
    return new AddCosignatoryWorkplacesResponseDTO(await this.cosignatoryService.addCosignatoryWorkplaces(id, workplacesDTO, user));
  }

  @Delete('/:id')
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @Auth(USER_ROLE.CO_SECRETARY)
  @ApiOkResponse({ type: DeleteCosignatoryResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  @SerializeOptions({
    groups: [COMMON, COSEC],
  })
  async deleteCosignatory(@Param() { id }: IdParamDTO, @Req() { user }: RequestWithUser): Promise<DeleteCosignatoryResponseDTO> {
    const cosignatory = await this.cosignatoryService.deleteCosignatoryWithoutResolutions(id, user.allianceId);
    return new DeleteCosignatoryResponseDTO({ result: true, cosignatory });
  }

  @Get('/:id/messages')
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @Auth(USER_ROLE.CO_SECRETARY)
  @ApiOkResponse({ type: GetCosignatoryMessagesResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  async getCosignatoryMessages(
    @Param() { id }: IdParamDTO,
      @Query() filters: GetCosignatoryMessagesQueryDTO,
      @Req() { user }: RequestWithUser
  ): Promise<GetCosignatoryMessagesResponseDTO> {
    return new GetCosignatoryMessagesResponseDTO(await this.userService.getUserMessages(id, filters, user.allianceId));
  }

  @Post('/:id/messages/:messageId/resend')
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @Auth(USER_ROLE.CO_SECRETARY)
  @ApiOkResponse({ type: ResendCosignatoryMessageResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  async resendCosignatoryMessage(@Param() { id, messageId }: ResendCosignatoryMessageParamDTO): Promise<ResendCosignatoryMessageResponseDTO> {
    return new ResendCosignatoryMessageResponseDTO(await this.userMessageService.resendUserMessage(id, messageId));
  }

  @Patch('/:id/comment')
  @Auth(USER_ROLE.CO_SECRETARY)
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @ApiOkResponse({ type: EditCosignatoryCommentResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  async editCosignatoryComment(@Param() { id }: IdParamDTO, @Req() { user }: RequestWithUser, @Body() { text }: EditCosignatoryCommentBodyDTO)
    : Promise<EditCosignatoryCommentResponseDTO> {
    return new EditCosignatoryCommentResponseDTO(await this.cosignatoryService.saveComment(id, text, user));
  }

  @Delete('/:id/comment')
  @Auth(USER_ROLE.CO_SECRETARY)
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @ApiOkResponse({ type: DeleteCosignatoryCommentResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  async deleteCosignatoryComment(@Param() { id }: IdParamDTO, @Req() { user }: RequestWithUser): Promise<DeleteCosignatoryCommentResponseDTO> {
    return new DeleteCosignatoryCommentResponseDTO(await this.cosignatoryService.deleteComment(id, user));
  }

  @Patch('/:id/status')
  @Auth(USER_ROLE.CO_SECRETARY)
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @ApiOkResponse({ type: EditCosignatoryStatusResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  async editCosignatoryStatus(@Body() { status }: EditCosignatoryStatusBodyDTO, @Param() { id }: IdParamDTO, @Req() { user }: RequestWithUser): Promise<EditCosignatoryStatusResponseDTO> {
    return new EditCosignatoryStatusResponseDTO(await this.cosignatoryService.editCosignatoryStatus(status, id, user));
  }
}
