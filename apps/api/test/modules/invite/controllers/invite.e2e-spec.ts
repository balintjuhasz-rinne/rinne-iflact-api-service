import { MESSAGE_DELIVERY, NOTIFICATION_TEMPLATES, USER_ROLE } from '@flact/constants';
import { AllianceEntity, InviteEntity, UserEntity } from '@flact/entities';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { clearQuery, insertQuery } from '../../../../../../.test/helpers/query.builder.helper';
import { InviteRepository } from '../../../../src/modules/invite/repositories/invite.repository';
import { NotificationService } from '../../../../src/modules/notification/services/notification.service';
import { initApp } from '../../../app';
import { MAIN_ALLIANCE_ID } from '../../mocks/alliance.data';

const PRIVATE_TOKEN = 'token';
const INVITED_MAIL = 'test-invite@gmail.com';

describe('InviteController', () => {
  let app: INestApplication;
  let notificationService: NotificationService;
  let inviteRepository: InviteRepository;

  beforeAll(async (done) => {
    app = await initApp();
    notificationService = app.get(NotificationService);
    inviteRepository = app.get(InviteRepository);

    done();
  });

  afterAll(async () => {
    await clearQuery(AllianceEntity);

    await app.close();
  });

  describe('re-send', () => {
    let sendDirectNotificationSpy;
    const TEST_INVITE = { id: 1, allianceId: MAIN_ALLIANCE_ID, email: INVITED_MAIL, token: PRIVATE_TOKEN };
    const INVITED_USER = {
      id: 4,
      allianceId: MAIN_ALLIANCE_ID,
      email: INVITED_MAIL,
      normalizedEmail: INVITED_MAIL,
      registrationCompleted: false,
      role: USER_ROLE.CO_SIGNATORY,
    };

    beforeAll(async () => {
      sendDirectNotificationSpy = jest
        .spyOn(notificationService, 'sendDirectNotification')
        .mockImplementation(() => Promise.resolve());

      await insertQuery(UserEntity, [INVITED_USER]);
    });

    afterEach(() => {
      sendDirectNotificationSpy.mockClear();
    });

    afterAll(async () => {
      await clearQuery(UserEntity);
    });

    describe('success', () => {

      beforeEach(async () => {
        await insertQuery(InviteEntity, [TEST_INVITE]);
      });

      afterEach(async () => {
        await clearQuery(InviteEntity);
      });

      it('should send new notifications', () => {
        return request(app.getHttpServer())
          .patch('/api/v1/invite/re-send')
          .send({ email: INVITED_MAIL })
          .expect(HttpStatus.OK)
          .then(() => {
            expect(sendDirectNotificationSpy).toBeCalledTimes(1);
            expect(sendDirectNotificationSpy).toBeCalledWith(INVITED_USER.id, NOTIFICATION_TEMPLATES.INVITE_USER, expect.anything(), MESSAGE_DELIVERY.EMAIL);
          });
      });

      it('should update old token', async () => {
        const invite = await inviteRepository.find({ email: INVITED_MAIL });
        expect(invite.length).toEqual(1);
        expect(invite[0].token).toEqual(PRIVATE_TOKEN);

        return request(app.getHttpServer())
          .patch('/api/v1/invite/re-send')
          .send({ email: INVITED_MAIL })
          .expect(HttpStatus.OK)
          .then(async () => {
            const invite = await inviteRepository.find({ email: INVITED_MAIL });
            expect(invite.length).toEqual(1);
            expect(invite[0].token).not.toEqual(PRIVATE_TOKEN);
          });
      });
    });

  });

});
