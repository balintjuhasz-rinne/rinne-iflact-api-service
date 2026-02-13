import { USER_ROLE } from '@flact/constants';
import { AllianceEntity, UserEntity } from '@flact/entities';
import { ClassSerializerInterceptor, ExecutionContext, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { SmsService } from '@pixelplex/sms-service';
import { CLIENT_NAME, RSA } from 'config';
import { when } from 'jest-when';
import { insertQuery } from '../../../.test/helpers/query.builder.helper';
import { AppModule } from '../src/app.module';
import { readToken } from '../src/helpers';
import { MAIN_ALLIANCE_ID, OTHER_ALLIANCE, OTHER_ALLIANCE_ID } from './modules/mocks/alliance.data';
import { PRIVATE_KEY_MOCK, PUBLIC_KEY_MOCK } from './modules/mocks/keys';
import { COSEC_USER, COSIGN_USER } from './modules/mocks/user.data';

jest.mock('../src/helpers', () => ({
  ...jest.requireActual('../src/helpers'),
  readToken: jest.fn(),
}));

when(readToken).calledWith(RSA.PRIVATE_KEY_PATH).mockReturnValue(PRIVATE_KEY_MOCK);
when(readToken).calledWith(RSA.PUBLIC_KEY_PATH).mockReturnValue(PUBLIC_KEY_MOCK);

export const initApp = async (initDb: boolean = true) => {
  when(readToken).calledWith(RSA.PRIVATE_KEY_PATH).mockReturnValue(PRIVATE_KEY_MOCK);
  when(readToken).calledWith(RSA.PUBLIC_KEY_PATH).mockReturnValue(PUBLIC_KEY_MOCK);
  const moduleRef = await Test
    .createTestingModule({ imports: [AppModule] })
    .overrideProvider(JwtService)
    .useValue(new JwtService({ privateKey: PRIVATE_KEY_MOCK }))
    .overrideProvider(SmsService)
    .useValue({ sendSms: Promise.resolve(true) })
    .overrideGuard(AuthGuard('jwt'))
    .useValue({
      canActivate: (context: ExecutionContext) => {
        const req = context.switchToHttp().getRequest();
        switch (req.headers.role) {
        case USER_ROLE.ADMIN:
          req.user = { role: USER_ROLE.ADMIN, id: 1, allianceId: MAIN_ALLIANCE_ID };
          break;
        case USER_ROLE.CO_SIGNATORY:
          req.user = { role: COSIGN_USER.role, id: COSIGN_USER.id, allianceId: MAIN_ALLIANCE_ID };
          break;
        default:
          req.user = { role: COSEC_USER.role, id: COSEC_USER.id, allianceId: MAIN_ALLIANCE_ID };
          break;
        }
        return true;
      },
    })
    .compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector), {
      excludeExtraneousValues: true,
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidUnknownValues: true,
    }),
  );
  app.setGlobalPrefix('api/v1');
  await app.init();
  if (initDb) {
    await initBaseEntities();
  }

  return app;
};

const initBaseEntities = async () => {
  await insertQuery(AllianceEntity, [{ id: MAIN_ALLIANCE_ID, name: CLIENT_NAME }]);
  await insertQuery(AllianceEntity, [{ id: OTHER_ALLIANCE_ID, name: OTHER_ALLIANCE }]);

  const users = [COSEC_USER, COSIGN_USER].map(user => ({
    ...user,
    allianceId: MAIN_ALLIANCE_ID,
    normalizedEmail: user.email,
    password: 'Bla1234Bla',
  }));
  await insertQuery(UserEntity, users);
};
