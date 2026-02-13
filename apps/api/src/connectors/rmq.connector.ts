import { apiDlClient } from '@flact/connectors';
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Client, ClientProxy } from '@nestjs/microservices';

@Injectable()
export class RmqConnector implements OnApplicationBootstrap {

  @Client(apiDlClient)
  clientRecovery: ClientProxy;

  async onApplicationBootstrap() {
    await this.clientRecovery.connect();
  }

}
