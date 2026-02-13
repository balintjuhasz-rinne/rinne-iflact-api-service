import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from '../../../src/modules/auth/services/token.service';
import { initApp } from '../../app';

describe('TokenService', () => {
  let app: INestApplication;
  let tokenService: TokenService;
  let jwtService: JwtService;

  beforeAll(async () => {
    app = await initApp(false);
    tokenService = app.get(TokenService);
    jwtService = app.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('generatePrivateToken', () => {
    const email = 'test@gmail.com';
    it('should return encrypted token with email', async () => {
      const token = await tokenService.generatePrivateToken({ email });
      const decode = jwtService.decode(token) as { email: string };
      expect(decode.email).toEqual(email);
    });
  });
});
