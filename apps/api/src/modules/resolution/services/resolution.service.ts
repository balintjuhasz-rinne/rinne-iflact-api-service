import {
  ACTIVITY_ACTION,
  COMPANY_ERRORS,
  DOCUMENT_MIME_TYPES,
  FILE_ERRORS,
  FORBIDDEN_ERROR,
  MESSAGE_TYPE,
  NotificationTemplate,
  NOTIFICATION_TEMPLATES,
  RESOLUTION_CLOSED_STATUSES,
  RESOLUTION_COMMENT_ERRORS,
  RESOLUTION_DETAILS_PATH,
  RESOLUTION_ERRORS,
  RESOLUTION_POSITION,
  RESOLUTION_STATUS,
  RESOLUTION_VOTE,
  USER_ERRORS,
  USER_ROLE,
  VOTE_ACTIVITY,
} from '@flact/constants';
import { GetResolutionsMessageDTO, ResolutionInfoMessageDTO, ResolutionMessageDTO, VoteMessageDTO } from '@flact/dtos';
import { FileEntity, ResolutionCommentEntity, ResolutionEntity, UserEntity } from '@flact/entities';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  sentryService,
  UnprocessableEntityError,
} from '@flact/exceptions';
import { getIds } from '@flact/helpers';
import {
  IMessageResolutionCanceled,
  IMessageResolutionCommentEvent,
  IMessageResolutionCreated,
  IMessageResolutionStatusChanged,
} from '@flact/interfaces';
import { Inject, Injectable } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { APP_TIME_ZONE, CLIENT_NAME, FRONTEND_URL } from 'config';
import { Connection, In } from 'typeorm';
import { formatDate } from '../../../helpers';
import { JwtPayload } from '../../auth/dtos/jwt.payload.dto';
import { FileService } from '../../file/services/file.service';
import { NotificationService } from '../../notification/services/notification.service';
import { RabbitmqBlockchainService } from '../../rabbitmq/services/rabbitmq.blockchain.service';
import { UrlShortenerService } from '../../url-shortener/services/url.shortener.service';
import {
  CreateResolutionBodyDTO,
  GetResolutionsQueryDTO,
  VoteForResolutionBodyDTO,
} from '../dtos/resolution.controller.dtos';
import { ResolutionInfo } from '../models/resolution.info.model';
import { Resolution } from '../models/resolution.model';
import { CosignatoryVote } from '../models/voting.model';
import { ActivityRepository } from '../repositories/activity.repository';
import { AllianceRepository } from '../repositories/alliance.repository';
import { CompanyRepository } from '../repositories/company.repository';
import { FileRepository } from '../repositories/file.repository';
import { ResolutionCommentRepository } from '../repositories/resolution.comment.repository';
import { ResolutionRepository } from '../repositories/resolution.repository';
import { UserRepository } from '../repositories/user.repository';
import { BlockchainResolutionService } from './blockchain.resolution.service';
import { BlockchainResolutionRmqService } from './impl/blockchain.resolution.rmq.service';
import { XRPLPaymentRmqService } from './impl/xrplLedger.payment.rmq.service';

@Injectable()
export class ResolutionService {

  constructor(
    private readonly allianceRepository: AllianceRepository,
    private readonly fileRepository: FileRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly resolutionRepository: ResolutionRepository,
    private readonly activityRepository: ActivityRepository,
    private readonly userRepository: UserRepository,
    private readonly commentRepository: ResolutionCommentRepository,
    @Inject(BlockchainResolutionRmqService)
    private readonly blockchainResolutionService: BlockchainResolutionService,
    private readonly fileService: FileService,
    private readonly urlShortenerService: UrlShortenerService,
    private readonly rabbitmqBlockchainService: RabbitmqBlockchainService,
    private readonly notificationService: NotificationService,
    private readonly connection: Connection,
    @Inject(XRPLPaymentRmqService)
    private readonly xrplPaymentRmqService: XRPLPaymentRmqService
  ) { }

  private async getCompanyOrFail(id: number, allianceId: number) {
    const company = await this.companyRepository.findOne({ where: { id, allianceId } });
    if (!company) {
      throw new UnprocessableEntityError([{ field: 'companyId', message: COMPANY_ERRORS.COMPANY_NOT_FOUND }]);
    }
    return company;
  }

  private async getCosignatoryOrFail(id: number, allianceId: number) {
    const user = await this.userRepository.findOne({ where: { id, allianceId } });
    if (!user) {
      throw new UnprocessableEntityError([{ field: 'cosignatoryId', message: USER_ERRORS.USER_NOT_FOUND }]);
    }
    return user;
  }

  private async getResolutionOrFail(resolutionId: number, allianceId: number, relations: string[] = []) {
    const resolution = await this.resolutionRepository.findOne({ where: { resolutionId, allianceId }, relations });
    if (!resolution) {
      throw new UnprocessableEntityError([{ field: 'id', message: RESOLUTION_ERRORS.RESOLUTION_NOT_FOUND }]);
    }
    return resolution;
  }

  private async getResolutionCosignatories(id: number) {
    const { resolution, voting: { votes } } = await this.rabbitmqBlockchainService.getResolutionInfo(id);
    return this.expandResolutionCosignatories(votes, resolution);
  }

  private async getResolutionCosecretary(id: number): Promise<UserEntity> {
    const resolutionInfo = await this.rabbitmqBlockchainService.getResolutionInfo(id);
    const cosecretary = await this.userRepository.findOne({ id: resolutionInfo?.resolution?.cosecId });
    if (!cosecretary) {
      sentryService.message(RESOLUTION_ERRORS.RESOLUTION_COSECRETARY_NOT_FOUND);
    }
    return cosecretary;
  }

  private async getDocumentsOrFail(documentsIds: number[]): Promise<FileEntity[]> {
    const documents = await this.fileRepository.find({ where: { id: In(documentsIds) } });
    if (documents.find((document) => !DOCUMENT_MIME_TYPES.includes(document.type))) {
      throw new UnprocessableEntityError([{ field: 'documentsIds', message: FILE_ERRORS.FILE_INVALID_TYPE }]);
    }
    if (documents.length !== documentsIds.length) {
      throw new NotFoundError([{ field: 'documentsIds', message: FILE_ERRORS.FILE_NOT_FOUND }]);
    }
    return documents;
  }

  private validateVotingDatesOrFail(resolutionDTO: CreateResolutionBodyDTO) {
    if (resolutionDTO.votingStartDate > resolutionDTO.votingEndDate) {
      throw new BadRequestError([{
        field: 'votingEndDate',
        message: RESOLUTION_ERRORS.VOTING_START_DATE_MORE_THAN_END_DATE,
      }]);
    }
  }

  async createResolution(resolutionDTO: CreateResolutionBodyDTO, { id: cosecId, allianceId }: JwtPayload): Promise<number> {
    const { companyId, documentsIds, votingStartDate, votingEndDate } = resolutionDTO;

    await this.validateVotingDatesOrFail(resolutionDTO);
    await this.getCompanyOrFail(companyId, allianceId);

    const documents = await this.getDocumentsOrFail(documentsIds);

    const hashes = documents.map(document => document.hash);
    const resolution: Partial<Resolution> = {
      ...resolutionDTO,
      votingStartDate: votingStartDate.toISOString(),
      votingEndDate: votingEndDate.toISOString(),
      hashes,
      cosecId,
    };
    console.log('Start Pay', resolution);
    const payment = {
      ...resolutionDTO,
      'ourSeed': 'sEdTeGttTDNbJqbkFfPUn9Jik7G3mcB',
      'broker1Seed': 'sEd7uP3fGuZEJgjektMV1pRJVNGKmwp',
      'broker2Seed': 'sEd7o6xvhgcPZF48QepYaHR3xecAdjS',
      'clientSeed': 'sEd737p5PsKi86zwCQERpuegqMgmgZa',
      'ourAddress': 'rB6hZnZbjF7mAQ96b4CCXjv3dv9ZxeHRGm',
      'broker1Address': 'rEDNPv4gKLsTHQM7vvyyYyRPfgKJMSY4wE',
      'broker2Address': 'rsc3QoGSPB1c4YtYBJuaGB1cLMvh5o1mob',
      'clientAddress': 'rBqhpHxq6N7JidN95pZ8ji7oCXNprYtPAv',
      'issuer': 'rNT65s5nPDiM5MXV2yCYyfPgvPqv4nnh6o',
    };
    const resolutionId = await this.blockchainResolutionService.createResolution(resolution);

    await Promise.all([
      this.resolutionRepository.save({ documents, resolutionId, allianceId }),
      this.activityRepository.save({ userId: cosecId, allianceId, resolutionId, action: ACTIVITY_ACTION.CREATED_RESOLUTION }),
    ]);

    await this.sendResolutionCreatedNotifications(resolutionId, resolutionDTO.votingEndDate.toISOString());

    try{
      const payRes = await this.xrplPaymentRmqService.createPayment(payment);
      console.log('Result Pay', payRes, payment);
    }catch(e){
      console.error(e)
    }
    return resolutionId;
  }

  private async sendResolutionCreatedNotifications(resolutionId: number, votingEndDate: string) {
    const cosignatories = await this.getResolutionCosignatories(resolutionId);

    const longLink = `${FRONTEND_URL}${RESOLUTION_DETAILS_PATH}/${resolutionId}`;
    const link = await this.urlShortenerService.shortenUrl(longLink, MESSAGE_TYPE.NEW_APPROVAL_REQUEST);
    await Promise.all(cosignatories.map(({ id, email, phoneNumber }) => {
      const data: IMessageResolutionCreated = {
        email,
        phoneNumber,
        context: {
          resolutionId,
          link,
          longLink,
          votingEndDate: formatDate(votingEndDate, { tz: APP_TIME_ZONE }),
        },
      };
      return this.notificationService.sendEventNotifications(id, NOTIFICATION_TEMPLATES.NEW_RESOLUTION_CREATED, data);
    }));
  }

  async voteForResolution(vote: VoteForResolutionBodyDTO, { id: userId, allianceId }: JwtPayload): Promise<void> {

    await this.getResolutionOrFail(vote.resolutionId, allianceId);
    await this.connection.transaction(async (manager) => {

      const activityRepository = manager.getCustomRepository(ActivityRepository);
      await activityRepository.save({
        resolutionId: vote.resolutionId,
        userId,
        allianceId,
        action: VOTE_ACTIVITY[vote.vote],
      });

      await this.rabbitmqBlockchainService.voteForResolution({ ...vote, cosignatoryId: userId });
    });
  }

  async cancelResolution(resolutionId: number, cancelReason: string, { id: userId, allianceId }: JwtPayload): Promise<void> {
    await this.getResolutionOrFail(resolutionId, allianceId);
    await this.rabbitmqBlockchainService.cancelResolution({ resolutionId, cancelReason });
    await this.activityRepository.save({
      action: ACTIVITY_ACTION.CANCELLED_RESOLUTION,
      userId,
      allianceId,
      resolutionId,
    });

    const cosignatories = await this.getResolutionCosignatories(resolutionId);

    const longLink = `${FRONTEND_URL}${RESOLUTION_DETAILS_PATH}/${resolutionId}`;
    const link = await this.urlShortenerService.shortenUrl(longLink, MESSAGE_TYPE.DOCUMENT_CANCELLED);
    await Promise.all(cosignatories.map(({ id, email, phoneNumber }) => {
      const data: IMessageResolutionCanceled = {
        email,
        phoneNumber,
        context: {
          link,
          longLink,
          resolutionId: resolutionId,
        },
      };
      return this.notificationService.sendEventNotifications(id, NOTIFICATION_TEMPLATES.RESOLUTION_CANCELED, data);
    }));
  }

  async editResolutionDocument(resolutionId: number, documentsIds: number[], { id: userId, allianceId }: JwtPayload): Promise<void> {
    const resolution = await this.getResolutionOrFail(resolutionId, allianceId, ['documents']);

    const documents = await this.getDocumentsOrFail([1]/*documentsIds*/);
    const unnecessaryDocuments = resolution.documents.filter(({ id }) => !documentsIds.includes(id));

    const hashes = documents.map(document => document.hash);

    await this.rabbitmqBlockchainService.editResolution({ resolutionId, hashes });

    await Promise.all([
      this.resolutionRepository.save({ ...resolution, documents }),
      this.activityRepository.save({ resolutionId, userId, allianceId, action: ACTIVITY_ACTION.EDITED_RESOLUTION }),
      this.removeDocuments(unnecessaryDocuments),
    ]);
  }

  private async removeDocuments(documents: FileEntity[]): Promise<void> {
    await this.fileService.removeFiles(documents.map(document => document.id));
  }

  async getResolution(id: number, { role, id: userId, allianceId }: JwtPayload): Promise<ResolutionInfo> {
    const resolutionInfo = await this.rabbitmqBlockchainService.getResolutionInfo(id);

    if (role === USER_ROLE.CO_SIGNATORY && !Object.keys(resolutionInfo.voting.votes).includes(userId.toString())) {
      throw new ForbiddenError([{ field: 'id', message: FORBIDDEN_ERROR }]);
    }

    return this.expandResolutionInfo(resolutionInfo, allianceId);
  }

  async getResolutions(query: GetResolutionsQueryDTO, user: JwtPayload): Promise<[ResolutionInfo[], number]> {
    const filters = await this.prepareResolutionsFilters(query, user.allianceId);

    const { count, resolutionsInfo } = await this.rabbitmqBlockchainService.getResolutionsInfo(filters);
    console.log('filters', filters, count, resolutionsInfo);
    const expandedResolutionsInfo = await Promise.all(resolutionsInfo.map((resolution => this.expandResolutionInfo(resolution, user.allianceId))));

    return [expandedResolutionsInfo, count];
  }

  async prepareResolutionsFilters({ resolutionIdentity, searchString, status, ...filters }: GetResolutionsQueryDTO, allianceId: number): Promise<GetResolutionsMessageDTO> {
    const additionalFilters: Partial<GetResolutionsMessageDTO> = {
      ...(status && { statuses: status === RESOLUTION_STATUS.CLOSED ? RESOLUTION_CLOSED_STATUSES : [status] }),
    };

    if (filters.companyId) {
      await this.getCompanyOrFail(filters.companyId, allianceId);
    }
    if (filters.cosignatoryId) {
      await this.getCosignatoryOrFail(filters.cosignatoryId, allianceId);
    }
    if (filters.resolutionId) {
      await this.getResolutionOrFail(filters.resolutionId, allianceId);
      additionalFilters.resolutionsIds = [filters.resolutionId];
    }
    if (resolutionIdentity || searchString) {
      const resolutions = await this.resolutionRepository.findIdsByIdTemplates([resolutionIdentity, searchString]);
      const companies = searchString ? await this.companyRepository.findIdsByName(searchString) : [];

      additionalFilters.condParams = {
        resolutionsIds: getIds(resolutions),
        companiesIds: getIds(companies),
        ...(resolutionIdentity && { resolutionName: resolutionIdentity }),
      };
    }

    return plainToClass(GetResolutionsMessageDTO, { ...filters, ...additionalFilters });
  }

  async getResolutionsData(projections: (keyof ResolutionEntity)[], user: JwtPayload): Promise<ResolutionEntity[]> {
    return this.resolutionRepository.find({ where: { allianceId: user.allianceId }, select: projections });
  };

  async sendResolutionStatusNotifications(resolutionId: number, status: RESOLUTION_STATUS) {
    const notificationMessage = (status === RESOLUTION_STATUS.ACCEPTED)
      ? NOTIFICATION_TEMPLATES.STATUS_ACCEPTED
      : NOTIFICATION_TEMPLATES.STATUS_REJECTED;

    const cosignatories = await this.getResolutionCosignatories(resolutionId);
    const cosecretary = await this.getResolutionCosecretary(resolutionId);

    const longLink = `${FRONTEND_URL}${RESOLUTION_DETAILS_PATH}/${resolutionId}`;
    const link = await this.urlShortenerService.shortenUrl(longLink, notificationMessage.type);
    await Promise.all([...cosignatories, cosecretary].map(({ id, email, phoneNumber }) => {
      const data: IMessageResolutionStatusChanged = {
        email,
        phoneNumber,
        context: {
          link,
          longLink,
          resolutionId: resolutionId,
          status,
        },
      };
      return this.notificationService.sendEventNotifications(id, notificationMessage, data);
    }));
  }

  async saveSystemResolutionActivity(resolutionId: number, status: RESOLUTION_STATUS) {
    const { id: allianceId } = await this.allianceRepository.findOne({ where: { name: CLIENT_NAME } });

    const action = status === RESOLUTION_STATUS.REJECTED
      ? ACTIVITY_ACTION.REJECTED_RESOLUTION
      : ACTIVITY_ACTION.ACCEPTED_RESOLUTION;

    await this.activityRepository.save({ userId: null, allianceId, resolutionId, action });
  };

  private async expandResolutionInfo({ resolution, voting: { votes, ...voting } }: ResolutionInfoMessageDTO, allianceId: number): Promise<ResolutionInfo> {
    const [company, cosec, documents, cosignatories] = await Promise.all([
      this.companyRepository.findOne({ where: { id: resolution.companyId, allianceId }, relations: ['logo'] }),
      this.userRepository.findOne({ where: { id: resolution.cosecId, allianceId } }),
      this.resolutionRepository.getDocuments(resolution.id, allianceId),
      this.expandResolutionCosignatories(votes, resolution),
    ]);

    return {
      resolution: { ...resolution, company, cosec, documents },
      voting: { ...voting, cosignatories },
    };
  }

  private async expandResolutionCosignatories(votes: Map<string, VoteMessageDTO>, resolution: ResolutionMessageDTO): Promise<CosignatoryVote[]> {

    return (await this.userRepository.findByIds(Object.keys(votes), { relations: ['avatar', 'workplaces'] }))
      .map(({ workplaces, ...user }) => {
        const { vote, date, voting_value, veto_power } = votes[user.id];
        let { votingValue, vetoPower } = {
          votingValue: 1,
          vetoPower: false,
        };
        try {
          const wpPwoer = workplaces.find(({ companyId }) => companyId === resolution.companyId);
          votingValue = wpPwoer.votingValue ?? 1;
          vetoPower = wpPwoer.vetoPower;
        } catch (e) {
          console.error('Workplace error,', e);
        }

        return {
          vote,
          voteDate: date,
          votingValue: Object.values(RESOLUTION_VOTE).includes(vote) ? voting_value : votingValue,
          vetoPower: Object.values(RESOLUTION_VOTE).includes(vote) ? veto_power : vetoPower,
          position: RESOLUTION_POSITION[resolution.type],
          ...user,
        };
      });
  }

  async saveComment(resolutionId: number, text: string, { id: userId, allianceId }: JwtPayload): Promise<ResolutionCommentEntity> {
    const { id } = await this.getResolutionOrFail(resolutionId, allianceId);
    const comment = await this.commentRepository.findOne({ resolutionId: id, authorId: userId });
    const [action, notificationTemplate] = comment
      ? [ACTIVITY_ACTION.UPDATE_COMMENT, NOTIFICATION_TEMPLATES.COSIGNATORY_UPDATE_COMMENT]
      : [ACTIVITY_ACTION.LEFT_COMMENT, NOTIFICATION_TEMPLATES.COSIGNATORY_LEFT_COMMENT];

    await this.activityRepository.save({ userId, allianceId, resolutionId, action });
    await this.sendNotificationsAboutComment(notificationTemplate, resolutionId);
    return this.commentRepository.save({ ...comment, resolutionId: id, text, authorId: userId });
  }

  async deleteComment(resolutionId: number, { id: userId, allianceId }: JwtPayload): Promise<ResolutionCommentEntity> {
    const { id } = await this.getResolutionOrFail(resolutionId, allianceId);
    const comment = await this.commentRepository.findOne({ resolutionId: id, authorId: userId });
    if (!comment) {
      throw new NotFoundError([{ field: '', message: RESOLUTION_COMMENT_ERRORS.RESOLUTION_COMMENT_NOT_FOUND }]);
    }
    await this.activityRepository.save({ userId, allianceId, resolutionId, action: ACTIVITY_ACTION.REMOVE_COMMENT });
    await this.sendNotificationsAboutComment(NOTIFICATION_TEMPLATES.COSIGNATORY_DELETE_COMMENT, resolutionId);
    return this.commentRepository.remove(comment);
  }

  async sendNotificationsAboutComment(template: NotificationTemplate, resolutionId: number): Promise<void> {
    const cosecretary = await this.getResolutionCosecretary(resolutionId);

    if (!cosecretary) {
      return;
    }

    const longLink = `${FRONTEND_URL}${RESOLUTION_DETAILS_PATH}/${resolutionId}`;
    const link = await this.urlShortenerService.shortenUrl(longLink, MESSAGE_TYPE.REMINDER);

    const data: IMessageResolutionCommentEvent = {
      email: cosecretary.email,
      phoneNumber: cosecretary.phoneNumber,
      context: {
        link,
        longLink,
        resolutionId,
      },
    };
    await this.notificationService.sendEventNotifications(cosecretary.id, template, data);
  }

  async getResolutionComments(resolutionId: number, user: JwtPayload): Promise<ResolutionCommentEntity[]> {
    const { comments } = await this.getResolutionOrFail(resolutionId, user.allianceId, ['comments', 'comments.author', 'comments.author.avatar']);
    return comments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
