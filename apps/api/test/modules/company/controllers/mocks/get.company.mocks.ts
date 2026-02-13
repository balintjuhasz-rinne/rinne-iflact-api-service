import { PNG_MIME_TYPE } from '@flact/constants';
import { baseCompanyData } from '.';

export const getCompanyResponse = {
  id: 1,
  name: 'Apple',
  address: 'Some address',
  financialYearEndDate: baseCompanyData.financialYearEndDate,
  incorporationDate: baseCompanyData.incorporationDate,
  nextMeetingDate: baseCompanyData.nextMeetingDate,
  phoneNumber: '+375333896543',
  registrationNumber: 'DC-34DS21-12',
  website: 'http://apple.com',
  comment: 'Good company',
  profile: 'Good profile',
  email: 'apple1@mail.ru',
  logo: { id: 1, path: 'path', type: PNG_MIME_TYPE, size: 200, originalName: 'logo1' },
  status: 'ACTIVE',
};
