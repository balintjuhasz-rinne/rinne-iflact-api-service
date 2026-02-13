import { Module } from '@nestjs/common';
import { StaticModule } from '@pixelplex/static-service';
import { FileService } from './services/file.service';

@Module({
  imports: [
    StaticModule,
  ],
  providers: [
    FileService,
  ],
  exports: [
    FileService,
  ],
})
export class FileModule {}
