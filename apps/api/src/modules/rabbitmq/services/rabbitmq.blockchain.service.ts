import { blockchainGeneralClient, blockchainReqResClient } from '@flact/connectors';
import {
  ALREADY_VOTED,
  DOES_NOT_EXIST_ERROR,
  HAS_ALREADY_VOTED,
  RABBITMQ_CONSTANTS,
  RESOLUTION_ERRORS,
  USER_POSITION,
  VOTING_HAS_ALREADY_CLOSED,
  VOTING_HAS_NOT_STARTED,
} from '@flact/constants';
import {
  CancelResolutionMessageDTO,
  CompanyIdUserIdMessageDTO,
  CreateDirectorMessageDTO,
  CreateShareholderMessageDTO,
  EditResolutionMessageDTO,
  GetResolutionsMessageDTO,
  RegisterCompanyMessageDTO,
  ResolutionInfoMessageDTO, ResolutionsInfoMessageDTO,
  UpdateShareholderMessageDTO,
  VoteForResolutionMessageDTO,
} from '@flact/dtos';
import { BadRequestError, InternalErrorException, NotFoundError, UnprocessableEntityError } from '@flact/exceptions';
import { Injectable } from '@nestjs/common';
import { Client, ClientProxy } from '@nestjs/microservices';
import { plainToClass } from 'class-transformer';

@Injectable()
export class RabbitmqBlockchainService {

  @Client(blockchainGeneralClient)
  eventClient: ClientProxy;
  @Client(blockchainReqResClient)
  messageClient: ClientProxy;

  sendRegisterCompanyEvent(message: RegisterCompanyMessageDTO) {
    this.eventClient.emit(RABBITMQ_CONSTANTS.AMQP_MESSAGE_TYPES.BLOCKCHAIN.REGISTER_COMPANY, message);
  }

  async sendRegisterCosignatoryEvent(positions: USER_POSITION[], userId: number, companyId: number, votingValue: number, vetoPower: boolean) {
    await Promise.all(positions.map((position) => {
      switch (position) {
      case USER_POSITION.DIRECTOR:
        return this.sendCreateDirectorEvent(
          plainToClass(CreateDirectorMessageDTO, {
            id: userId,
            companyId,
            vetoPower,
            votingValue,
            isChairman: false,
          }),
        );
      case USER_POSITION.SHARE_HOLDER:
        return this.sendCreateShareholderEvent(
          plainToClass(CreateShareholderMessageDTO, {
            id: userId,
            companyId,
            vetoPower,
            votingValue,
            isChairman: false,
          }),
        );
      }
    }));
  }

  private sendCreateDirectorEvent(message: CreateDirectorMessageDTO) {
    this.eventClient.emit(RABBITMQ_CONSTANTS.AMQP_MESSAGE_TYPES.BLOCKCHAIN.CREATE_DIRECTOR, message);
  }

  private sendCreateShareholderEvent(message: CreateShareholderMessageDTO) {
    this.eventClient.emit(RABBITMQ_CONSTANTS.AMQP_MESSAGE_TYPES.BLOCKCHAIN.CREATE_SHAREHOLDER, message);
  }

  async updateShareholder(message: UpdateShareholderMessageDTO): Promise<void> {
    this.eventClient.emit(RABBITMQ_CONSTANTS.AMQP_MESSAGE_TYPES.BLOCKCHAIN.UPDATE_SHAREHOLDER, message);
  }

  async removeCosignatory(positions: USER_POSITION[], companyIdUserId: CompanyIdUserIdMessageDTO) {
    await Promise.all([
      positions.map((position) => {
        switch (position) {
        case USER_POSITION.DIRECTOR:
          return this.removeDirector(companyIdUserId);
        case USER_POSITION.SHARE_HOLDER:
          return this.removeShareholder(companyIdUserId);
        }
      }),
    ]);
  }

  private async removeDirector(message: CompanyIdUserIdMessageDTO): Promise<void> {
    this.eventClient.emit(RABBITMQ_CONSTANTS.AMQP_MESSAGE_TYPES.BLOCKCHAIN.REMOVE_DIRECTOR, message);
  }

  private async removeShareholder(message: CompanyIdUserIdMessageDTO): Promise<void> {
    this.eventClient.emit(RABBITMQ_CONSTANTS.AMQP_MESSAGE_TYPES.BLOCKCHAIN.REMOVE_SHAREHOLDER, message);
  }

  voteForResolution(vote: VoteForResolutionMessageDTO): Promise<boolean> {
    return this.messageClient.send<boolean>(RABBITMQ_CONSTANTS.AMQP_MESSAGE_TYPES.BLOCKCHAIN.VOTE_FOR_RESOLUTION, vote)
      .toPromise()
      .catch(({ message }) => {
        if (HAS_ALREADY_VOTED.test(message)) {
          throw new UnprocessableEntityError([{
            field: 'resolutionId',
            message: RESOLUTION_ERRORS.COSIGNATORY_ALREADY_VOTED,
          }]);
        }
        if (VOTING_HAS_NOT_STARTED.test(message)) {
          throw new UnprocessableEntityError([{
            field: 'resolutionId',
            message: RESOLUTION_ERRORS.VOTING_HAS_NOT_STARTED,
          }]);
        }
        if (VOTING_HAS_ALREADY_CLOSED.test(message)) {
          throw new UnprocessableEntityError([{
            field: 'resolutionId',
            message: RESOLUTION_ERRORS.VOTING_ALREADY_CLOSED,
          }]);
        }
        if (DOES_NOT_EXIST_ERROR.test(message)) {
          throw new NotFoundError([{ field: 'resolutionId', message: RESOLUTION_ERRORS.RESOLUTION_NOT_FOUND }]);
        }
        throw new InternalErrorException([{ field: '', message, details: { server: 'Blockchain' } }]);
      });
  }

  getResolutionInfo(id: number): Promise<ResolutionInfoMessageDTO> {
    return this.messageClient.send<ResolutionInfoMessageDTO>(RABBITMQ_CONSTANTS.AMQP_MESSAGE_TYPES.BLOCKCHAIN.GET_RESOLUTION, id)
      .toPromise()
      .catch(({ message }) => {
        if (DOES_NOT_EXIST_ERROR.test(message)) {
          throw new NotFoundError([{ field: 'id', message: RESOLUTION_ERRORS.RESOLUTION_NOT_FOUND }]);
        }
        throw new InternalErrorException([{ field: '', message, details: { server: 'Blockchain' } }]);
      });
  }

  getResolutionsInfo(filters: GetResolutionsMessageDTO): Promise<ResolutionsInfoMessageDTO> {
    return this.messageClient.send<ResolutionsInfoMessageDTO>(RABBITMQ_CONSTANTS.AMQP_MESSAGE_TYPES.BLOCKCHAIN.GET_RESOLUTIONS, filters)
      .toPromise()
      .catch(({ message }) => {
        if (DOES_NOT_EXIST_ERROR.test(message)) {
          throw new BadRequestError([{ field: '', message: RESOLUTION_ERRORS.RESOLUTION_FILTER_NOT_FOUND }]);
        }
        throw new InternalErrorException([{ field: '', message, details: { server: 'Blockchain' } }]);
      });
  }

  cancelResolution(cancelMessage: CancelResolutionMessageDTO): Promise<boolean> {
    return this.messageClient.send<boolean>(RABBITMQ_CONSTANTS.AMQP_MESSAGE_TYPES.BLOCKCHAIN.CANCEL_RESOLUTION, cancelMessage)
      .toPromise()
      .catch(({ message }) => {
        if (DOES_NOT_EXIST_ERROR.test(message)) {
          throw new NotFoundError([{ field: 'resolutionId', message: RESOLUTION_ERRORS.RESOLUTION_NOT_FOUND }]);
        }
        throw new InternalErrorException([{ field: '', message, details: { server: 'Blockchain' } }]);
      });
  }

  editResolution(message: EditResolutionMessageDTO): Promise<boolean> {
    return this.messageClient.send<boolean>(RABBITMQ_CONSTANTS.AMQP_MESSAGE_TYPES.BLOCKCHAIN.EDIT_RESOLUTION, message)
      .toPromise()
      .catch(({ message }) => {
        if (ALREADY_VOTED.test(message)) {
          throw new UnprocessableEntityError([{
            field: 'resolutionId',
            message: RESOLUTION_ERRORS.VOTING_ALREADY_STARTED,
          }]);
        }
        throw new InternalErrorException([{ field: '', message, details: { server: 'Blockchain' } }]);
      });
  }
}
