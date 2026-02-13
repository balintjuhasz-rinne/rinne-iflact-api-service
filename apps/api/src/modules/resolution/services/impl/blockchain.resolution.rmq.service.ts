import { blockchainReqResClient } from '@flact/connectors';
import { COMPANY_ERRORS, DOES_NOT_EXIST_ERROR, RABBITMQ_CONSTANTS, SERVICE_UNAVAILABLE_ERROR } from '@flact/constants';
import { NotAcceptableError, NotFoundError } from '@flact/exceptions';
import { Injectable } from '@nestjs/common';
import { Client, ClientProxy } from '@nestjs/microservices';
import { mapResolutionToResolutionDTO } from '../../mappers';
import { Resolution } from '../../models/resolution.model';
import { BlockchainResolutionService } from '../blockchain.resolution.service';

const { CREATE_RESOLUTION } = RABBITMQ_CONSTANTS.AMQP_MESSAGE_TYPES.BLOCKCHAIN;

@Injectable()
export class BlockchainResolutionRmqService implements BlockchainResolutionService {

  @Client(blockchainReqResClient)
  messageClient: ClientProxy;

  async createResolution(resolution: Partial<Resolution>): Promise<number> {
    const { id } = await this.messageClient.send<{ id: number }>(CREATE_RESOLUTION, mapResolutionToResolutionDTO(resolution))
      .toPromise()
      .catch(({ message }) => {
        if (DOES_NOT_EXIST_ERROR.test(message)) {
          throw new NotFoundError([{ field: 'companyId', message: COMPANY_ERRORS.COMPANY_NOT_FOUND }]);
        }
        throw new NotAcceptableError([{ message: SERVICE_UNAVAILABLE_ERROR, details: { service: 'Blockchain' } }]);
      });

    return id;
  }
}
