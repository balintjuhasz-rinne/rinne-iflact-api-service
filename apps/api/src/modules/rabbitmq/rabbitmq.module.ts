import { Global, Module } from '@nestjs/common';
import { RabbitmqBlockchainService } from './services/rabbitmq.blockchain.service';
import { RabbitmqEmailService } from './services/rabbitmq.email.service';

const services = [RabbitmqEmailService, RabbitmqBlockchainService];

@Global()
@Module({
  providers: services,
  exports: services,
})
export class RabbitmqModule {}
