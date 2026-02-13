import { MESSAGE_TYPE, URL_SHORTENER_URLS } from '@flact/constants';
import { sentryService } from '@flact/exceptions';
import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class UrlShortenerService {
  async shortenUrl(longUrl: string, messageType: MESSAGE_TYPE): Promise<string> {
    if (longUrl.includes('localhost')) {
      return longUrl;
    }
    try {
      const { data: { shortUrl } } = await axios.post(URL_SHORTENER_URLS.SHORTEN, { longUrl, messageType });
      return shortUrl;
    } catch (e) {
      sentryService.error(e);
      return longUrl;
    }

  }
}
