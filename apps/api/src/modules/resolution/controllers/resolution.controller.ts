import { API_GROUP, HTTP_CONSTANTS, USER_ROLE } from '@flact/constants';
import { ExecutionTimer } from '@flact/decorators';
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
import { ApiBadRequestResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IdParamDTO } from '../../../dtos/id.param.dto';
import { toPlain } from '../../../helpers';
import { Auth } from '../../auth/decorators/auth.decorator';
import { RequestWithUser } from '../../auth/dtos/request.with.user.dto';
import {
  CancelResolutionBodyDTO,
  CancelResolutionResponseDTO,
  CreateResolutionBodyDTO,
  CreateResolutionResponseDTO,
  DeleteResolutionCommentResponseDTO,
  EditResolutionCommentBodyDTO,
  EditResolutionCommentResponseDTO,
  EditResolutionDocumentBodyDTO,
  EditResolutionDocumentResponseDTO,
  GetResolutionCommentsDTO,
  GetResolutionResponseDTO,
  GetResolutionsQueryDTO,
  GetResolutionsResponseDTO,
  VoteForResolutionBodyDTO,
  VoteForResolutionResponseDTO,
} from '../dtos/resolution.controller.dtos';
import { ResolutionService } from '../services/resolution.service';

@ApiTags('resolutions')
@Controller('resolutions')
@SerializeOptions({
  groups: [API_GROUP.COMMON],
})
export class ResolutionController {

  constructor(
    private readonly resolutionService: ResolutionService,
  ) { }

  @Get('/')
  @Auth(USER_ROLE.CO_SECRETARY, USER_ROLE.CO_SIGNATORY)
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @ApiQuery({ type: GetResolutionsQueryDTO })
  @ApiOkResponse({ type: GetResolutionsResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  @ApiQuery({ type: GetResolutionsQueryDTO })
  @ExecutionTimer()
  async getResolutions(@Query() resolutionsQueryDTO: GetResolutionsQueryDTO, @Req() { user }: RequestWithUser) {
    if (user.role === USER_ROLE.CO_SIGNATORY) {
      resolutionsQueryDTO.cosignatoryId = user.id;
    }

    const { skip, limit } = resolutionsQueryDTO;
    const [resolutionsInfo, count] = await this.resolutionService.getResolutions(resolutionsQueryDTO, user);

    const resolutionsResponse = new GetResolutionsResponseDTO({ resolutionsInfo, skip, limit, count });
    return toPlain(resolutionsResponse, { role: user.role });
  }

  @Get('/ids')
  @Auth(USER_ROLE.CO_SECRETARY, USER_ROLE.CO_SIGNATORY)
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @ApiOkResponse({ type: Number, isArray: true })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  async getResolutionsIds(@Req() { user }: RequestWithUser): Promise<number[]> {
    const resolutions = await this.resolutionService.getResolutionsData(['resolutionId'], user);
    return resolutions.map(resolution => resolution.resolutionId);
  }

  @Get('/:id')
  @Auth(USER_ROLE.CO_SECRETARY, USER_ROLE.CO_SIGNATORY)
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @ApiOkResponse({ type: GetResolutionResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  async getResolution(@Param() { id }: IdParamDTO, @Req() { user }: RequestWithUser) {
    const resolutionResponse = new GetResolutionResponseDTO(await this.resolutionService.getResolution(id, user));
    return toPlain(resolutionResponse, { role: user.role, isFull: true });
  }

  @Post('/')
  @Auth(USER_ROLE.CO_SECRETARY)
  @HttpCode(HTTP_CONSTANTS.CODE.CREATED)
  @ApiOkResponse({ type: CreateResolutionResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  async createResolution(@Body() resolutionDTO: CreateResolutionBodyDTO, @Req() { user }: RequestWithUser): Promise<CreateResolutionResponseDTO> {
    const resolutionId = await this.resolutionService.createResolution(resolutionDTO, user);
    return new CreateResolutionResponseDTO({ result: true, resolutionId });
  }

  @Post('vote')
  @Auth(USER_ROLE.CO_SIGNATORY)
  @HttpCode(HTTP_CONSTANTS.CODE.CREATED)
  @ApiOkResponse({ type: VoteForResolutionResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  async voteForResolution(@Body() vote: VoteForResolutionBodyDTO, @Req() { user }: RequestWithUser): Promise<VoteForResolutionResponseDTO> {
    await this.resolutionService.voteForResolution(vote, user);
    return new VoteForResolutionResponseDTO(true);
  }

  @Get('/:id/comments')
  @Auth(USER_ROLE.CO_SIGNATORY, USER_ROLE.CO_SECRETARY)
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @ApiOkResponse({ type: GetResolutionCommentsDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  async getResolutionComments(@Param() { id }: IdParamDTO, @Req() { user }: RequestWithUser): Promise<GetResolutionCommentsDTO> {
    const comments = new GetResolutionCommentsDTO(await this.resolutionService.getResolutionComments(id, user));
    return toPlain(comments, { role: user.role });
  }

  @Patch('/:id/comment')
  @Auth(USER_ROLE.CO_SIGNATORY)
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @ApiOkResponse({ type: EditResolutionCommentResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  async updateResolutionComment(@Param() { id }: IdParamDTO, @Body() { text }: EditResolutionCommentBodyDTO, @Req() { user }: RequestWithUser): Promise<EditResolutionCommentResponseDTO> {
    return new EditResolutionCommentResponseDTO(await this.resolutionService.saveComment(id, text, user));
  }

  @Delete('/:id/comment')
  @Auth(USER_ROLE.CO_SIGNATORY)
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @ApiOkResponse({ type: DeleteResolutionCommentResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  async deleteResolutionComment(@Param() { id }: IdParamDTO, @Req() { user }: RequestWithUser): Promise<DeleteResolutionCommentResponseDTO> {
    return new DeleteResolutionCommentResponseDTO(await this.resolutionService.deleteComment(id, user));
  }

  @Patch('/:id/cancel')
  @Auth(USER_ROLE.CO_SECRETARY)
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @ApiOkResponse({ type: CancelResolutionResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  async cancelResolution(@Param() { id }: IdParamDTO, @Body() { cancelReason }: CancelResolutionBodyDTO, @Req() { user }: RequestWithUser): Promise<CancelResolutionResponseDTO> {
    await this.resolutionService.cancelResolution(id, cancelReason, user);
    return new CancelResolutionResponseDTO(true);
  }

  @Patch('/:id/document')
  @Auth(USER_ROLE.CO_SECRETARY)
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @ApiOkResponse({ type: EditResolutionDocumentResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  async editResolutionDocument(@Param() { id }: IdParamDTO, @Body() { documentsIds }: EditResolutionDocumentBodyDTO, @Req() { user }: RequestWithUser): Promise<EditResolutionDocumentResponseDTO> {
    await this.resolutionService.editResolutionDocument(id, documentsIds, user);
    return new EditResolutionDocumentResponseDTO(true);
  }
}
