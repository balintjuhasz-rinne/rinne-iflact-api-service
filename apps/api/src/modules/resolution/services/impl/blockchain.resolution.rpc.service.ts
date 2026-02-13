import { blockchainRpcClient } from '@flact/connectors';
import { COMPANY_ERRORS, DOES_NOT_EXIST_ERROR, SERVICE_UNAVAILABLE_ERROR } from '@flact/constants';
import { NotAcceptableError, NotFoundError } from '@flact/exceptions';
import { ResolutionRpcService } from '@flact/interfaces';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, ClientGrpc } from '@nestjs/microservices';
import { mapResolutionToResolutionDTO } from '../../mappers';
import { Resolution } from '../../models/resolution.model';
import { BlockchainResolutionService } from '../blockchain.resolution.service';

@Injectable()
export class BlockchainResolutionRpcService implements BlockchainResolutionService, OnModuleInit {

  @Client(blockchainRpcClient)
  rpcClient: ClientGrpc;

  private resolutionRpcServise: ResolutionRpcService;

  onModuleInit() {
    this.resolutionRpcServise = this.rpcClient.getService<ResolutionRpcService>('ResolutionService');
  }

  async createResolution(resolution: Partial<Resolution>): Promise<number> {
    const { id } = await this.resolutionRpcServise.createResolution(mapResolutionToResolutionDTO(resolution)).toPromise()
      .catch(({ message }) => {
        if (DOES_NOT_EXIST_ERROR.test(message)) {
          throw new NotFoundError([{ field: 'companyId', message: COMPANY_ERRORS.COMPANY_NOT_FOUND }]);
        }
        throw new NotAcceptableError([{ message: SERVICE_UNAVAILABLE_ERROR, details: { service: 'Blockchain' } }]);
      });

    return id;
  }

}
