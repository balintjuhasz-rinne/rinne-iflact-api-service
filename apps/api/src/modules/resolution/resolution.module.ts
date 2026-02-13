import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileModule } from '../file/file.module';
import { ResolutionController } from './controllers/resolution.controller';
import { ResolutionEventController } from './controllers/resolution.event.controller';
import { ActivityRepository } from './repositories/activity.repository';
import { AllianceRepository } from './repositories/alliance.repository';
import { CompanyRepository } from './repositories/company.repository';
import { FileRepository } from './repositories/file.repository';
import { ResolutionCommentRepository } from './repositories/resolution.comment.repository';
import { ResolutionRepository } from './repositories/resolution.repository';
import { UserRepository } from './repositories/user.repository';
import { BlockchainResolutionRmqService } from './services/impl/blockchain.resolution.rmq.service';
import { BlockchainResolutionRpcService } from './services/impl/blockchain.resolution.rpc.service';
import { ResolutionService } from './services/resolution.service';
import { XRPLPaymentRmqService } from './services/impl/xrplLedger.payment.rmq.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AllianceRepository,
      FileRepository,
      ResolutionRepository,
      CompanyRepository,
      UserRepository,
      ActivityRepository,
      ResolutionCommentRepository,
    ]),
    FileModule,
  ],
  controllers: [
    ResolutionController,
    ResolutionEventController,
  ],
  providers: [ResolutionService, BlockchainResolutionRpcService, BlockchainResolutionRmqService, XRPLPaymentRmqService],
})
export class ResolutionModule {}
