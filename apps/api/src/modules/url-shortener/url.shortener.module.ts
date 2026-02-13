import { Global, Module } from '@nestjs/common';
import { UrlShortenerService } from './services/url.shortener.service';

@Global()
@Module({
  providers: [UrlShortenerService],
  exports: [UrlShortenerService],
})
export class UrlShortenerModule {}
