import { API_GROUP, HTTP_CONSTANTS, USER_ROLE } from '@flact/constants';
import { ExecutionTimer } from '@flact/decorators';
import { CompanyEntity } from '@flact/entities';
import { ErrorsResponse } from '@flact/exceptions';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
  SerializeOptions,
} from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IdParamDTO } from '../../../dtos/id.param.dto';
import { Auth } from '../../auth/decorators/auth.decorator';
import { RequestWithUser } from '../../auth/dtos/request.with.user.dto';
import {
  CreateCompanyBodyDTO,
  CreateCompanyResponseDTO,
  DeleteCompanyResponseDTO,
  GetCompaniesQueryDTO,
  GetCompaniesResponseDTO, GetCompanyLogsQueryDTO,
  GetCompanyLogsResponseDTO,
  GetCompanyResponseDTO,
  GetCompanyUsersResponseDTO,
  UpdateCompanyBodyDTO,
  UpdateCompanyResponseDTO,
} from '../dtos/company.controller.dtos';
import { CompanyService } from '../services/company.service';

@ApiTags('companies')
@Controller('companies')
@SerializeOptions({
  groups: [API_GROUP.COMMON],
})
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
  ) {}

  @Get('/')
  @Auth(USER_ROLE.CO_SECRETARY)
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @ApiOkResponse({ type: GetCompaniesResponseDTO })
  @ApiQuery({ type: GetCompaniesQueryDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  @SerializeOptions({
    groups: [API_GROUP.COMMON],
  })
  @ExecutionTimer()
  async getCompanies(@Query() filters: GetCompaniesQueryDTO, @Req() { user }: RequestWithUser): Promise<GetCompaniesResponseDTO> {
    return this.companyService.getCompanies(filters, user.allianceId);
  }

  @Get('/names')
  @Auth(USER_ROLE.CO_SECRETARY, USER_ROLE.CO_SIGNATORY)
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @ApiOkResponse({ type: String, isArray: true })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  @SerializeOptions({
    groups: [API_GROUP.COMMON],
  })
  @ExecutionTimer()
  async getCompaniesNames(@Req() { user }: RequestWithUser): Promise<CompanyEntity[]> {
    return this.companyService.getCompaniesNames(user);
  }

  @Get('/:id')
  @Auth(USER_ROLE.CO_SECRETARY)
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @ApiOkResponse({ type: GetCompanyResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  @SerializeOptions({
    groups: [API_GROUP.COMMON, API_GROUP.COMMON_FULL],
  })
  async getCompany(@Param() { id }: IdParamDTO, @Req() { user }: RequestWithUser): Promise<GetCompanyResponseDTO> {
    return new GetCompanyResponseDTO(await this.companyService.getCompany(id, user.allianceId));
  }

  @Post('/')
  @Auth(USER_ROLE.CO_SECRETARY)
  @HttpCode(HTTP_CONSTANTS.CODE.CREATED)
  @ApiOkResponse({ type: CreateCompanyResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  async createCompany(@Body() companyDto: CreateCompanyBodyDTO, @Req() { user }: RequestWithUser): Promise<CreateCompanyResponseDTO> {
    const company = await this.companyService.createCompany(companyDto, user);
    return new CreateCompanyResponseDTO({ result: true, company });
  }

  @Put('/:id')
  @Auth(USER_ROLE.CO_SECRETARY)
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @ApiOkResponse({ type: UpdateCompanyResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  async updateCompany(
    @Param() { id }: IdParamDTO,
      @Body() companyUpdateDto: UpdateCompanyBodyDTO,
      @Req() { user }: RequestWithUser,
  ): Promise<UpdateCompanyResponseDTO> {
    const company = await this.companyService.updateCompany(id, companyUpdateDto, user);
    return new UpdateCompanyResponseDTO({ result: true, company });
  }

  @Delete('/:id')
  @Auth(USER_ROLE.CO_SECRETARY)
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @ApiOkResponse({ type: DeleteCompanyResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  async deleteCompany(@Param() { id }: IdParamDTO, @Req() { user }: RequestWithUser): Promise<DeleteCompanyResponseDTO> {
    const company = await this.companyService.deleteCompany(id, user.allianceId);

    return new DeleteCompanyResponseDTO({ result: true, company });
  }

  @Get('/:id/users')
  @Auth(USER_ROLE.CO_SECRETARY)
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @ApiOkResponse({ type: GetCompanyUsersResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  @SerializeOptions({
    groups: [API_GROUP.COMMON, API_GROUP.COMMON_FULL, API_GROUP.COSEC],
  })
  async getCompanyUsers(@Param() { id }: IdParamDTO, @Req() { user }: RequestWithUser) {
    return new GetCompanyUsersResponseDTO(await this.companyService.getCompanyUsers(id, user));
  }

  @Get('/:id/logs')
  @Auth(USER_ROLE.CO_SECRETARY)
  @HttpCode(HTTP_CONSTANTS.CODE.OK)
  @ApiOkResponse({ type: GetCompanyLogsResponseDTO })
  @ApiBadRequestResponse({ type: ErrorsResponse })
  @SerializeOptions({
    groups: [API_GROUP.COMMON, API_GROUP.COSEC],
  })
  async getCompanyLogs(@Param() { id }: IdParamDTO, @Query() logParams: GetCompanyLogsQueryDTO, @Req() { user }: RequestWithUser): Promise<GetCompanyLogsResponseDTO> {
    return new GetCompanyLogsResponseDTO(await this.companyService.getCompanyLogs(id, logParams, user));
  }
}
