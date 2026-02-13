import { XRP_LEDGERReqResClient } from '@flact/connectors';
import { COMPANY_ERRORS, DOES_NOT_EXIST_ERROR, RABBITMQ_CONSTANTS, SERVICE_UNAVAILABLE_ERROR } from '@flact/constants';
import { NotAcceptableError, NotFoundError } from '@flact/exceptions';
import { Injectable } from '@nestjs/common';
import { Client, ClientProxy } from '@nestjs/microservices';
import { mapResolutionToResolutionDTO } from '../../mappers';
import { Resolution } from '../../models/resolution.model';
import { BlockchainResolutionService } from '../blockchain.resolution.service';

const { CREATE_PAYMENT } = RABBITMQ_CONSTANTS.AMQP_MESSAGE_TYPES.XRP_LEDGER;

@Injectable()
export class XRPLPaymentRmqService {

  @Client(XRP_LEDGERReqResClient)
  messageClient: ClientProxy;

  async createPayment(payment: any): Promise<any> {
    console.log('Something will start', payment);
    const res = await this.messageClient.send<any>(CREATE_PAYMENT, payment)
      .toPromise()
      .catch(({ message }) => {
        if (DOES_NOT_EXIST_ERROR.test(message)) {
          throw new NotFoundError([{ field: 'companyId', message: COMPANY_ERRORS.COMPANY_NOT_FOUND }]);
        }
        throw new NotAcceptableError([{ message: SERVICE_UNAVAILABLE_ERROR, details: { service: 'Xrp' } }]);
      });
    console.log('res', res);
    return {
      ok: 'ok',
    };
  }
}
