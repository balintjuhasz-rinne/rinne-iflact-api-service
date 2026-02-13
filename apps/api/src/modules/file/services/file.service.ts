import { Injectable, Logger } from '@nestjs/common';
import { StaticService } from '@pixelplex/static-service';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(
    private readonly staticService: StaticService,
  ) {}

  async removeFiles(ids: number[]): Promise<void> {
    await Promise.all(ids.map(id => this.removeFile(id)));
  };

  async removeFile(id: number): Promise<void> {
    this.logger.debug(`delete file with id: ${id}`);
    await this.staticService.deleteFile(id);
  };

}
