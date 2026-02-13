import { DOC_MIME_TYPE, DOCX_MIME_TYPE, JPEG_MIME_TYPE, PDF_MIME_TYPE, PNG_MIME_TYPE } from '@flact/constants';
import { FileEntity } from '@flact/entities';
import moment from 'moment';
import { MAIN_ALLIANCE_ID, OTHER_ALLIANCE_ID } from '../../../mocks/alliance.data';

const baseFile = { path: 'path', size: 200, originalName: 'logo1', key: 'base.file', hash: 'hash' };
export const testCompany1Logo: Partial<FileEntity> = { id: 1, type: PNG_MIME_TYPE, ...baseFile };
export const testCompany2Logo: Partial<FileEntity> = { id: 2, type: PNG_MIME_TYPE, ...baseFile };
export const testPdfFile: Partial<FileEntity> = { id: 3, type: PDF_MIME_TYPE, ...baseFile };
export const testDocFile: Partial<FileEntity> = { id: 4, type: DOC_MIME_TYPE, ...baseFile };
export const testDocxFile: Partial<FileEntity> = { id: 5, type: DOCX_MIME_TYPE, ...baseFile };
export const newLogo: Partial<FileEntity> = { id: 6, type: JPEG_MIME_TYPE, ...baseFile, originalName: 'new-logo' };

export const baseCompanyData = {
  address: 'Some address',
  financialYearEndDate: moment().add(7, 'months').toISOString(),
  incorporationDate: moment().add(7, 'months').toISOString(),
  nextMeetingDate: moment().add(7, 'months').toISOString(),
  phoneNumber: '+375333896543',
  registrationNumber: 'DC-34DS21-12',
  website: 'http://apple.com',
  comment: 'Good company',
  profile: 'Good profile',
};

export const testCompanies = [
  {
    id: 1,
    ...baseCompanyData,
    name: 'Apple',
    email: 'apple1@mail.ru',
    normalizedEmail: 'apple1@mail.ru',
    logoId: testCompany1Logo.id,
    allianceId: MAIN_ALLIANCE_ID,
  },
  {
    id: 2,
    ...baseCompanyData,
    name: 'Google',
    email: 'google@mail.ru',
    normalizedEmail: 'google@mail.ru',
    logoId: testCompany2Logo.id,
    allianceId: MAIN_ALLIANCE_ID,
  },
  {
    id: 3,
    ...baseCompanyData,
    name: 'Apple Sync',
    email: 'apple3@mail.ru',
    normalizedEmail: 'apple3@mail.ru',
    logoId: null,
    allianceId: MAIN_ALLIANCE_ID,
  },
  {
    id: 4,
    ...baseCompanyData,
    name: 'Apple Team',
    email: 'apple4@mail.ru',
    normalizedEmail: 'apple4@mail.ru',
    logoId: null,
    allianceId: MAIN_ALLIANCE_ID,
  },
  {
    id: 5,
    ...baseCompanyData,
    name: 'Apple Blog',
    email: 'apple5@mail.ru',
    normalizedEmail: 'apple5@mail.ru',
    logoId: null,
    allianceId: MAIN_ALLIANCE_ID,
  },
  {
    id: 6,
    ...baseCompanyData,
    name: 'Apple shazam',
    email: 'apple6@mail.ru',
    normalizedEmail: 'apple6@mail.ru',
    logoId: null,
    allianceId: OTHER_ALLIANCE_ID,
  },
];
