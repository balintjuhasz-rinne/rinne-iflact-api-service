import { UpdateCompanyBodyDTO } from '../../../../../src/modules/company/dtos/company.controller.dtos';
import { baseCompanyData, newLogo } from '.';

export const updateCompanyBody: UpdateCompanyBodyDTO = {
  address: 'Some address',
  financialYearEndDate: baseCompanyData.financialYearEndDate,
  incorporationDate: baseCompanyData.incorporationDate,
  nextMeetingDate: baseCompanyData.nextMeetingDate,
  phoneNumber: '+375333896543',
  registrationNumber: 'DC-34DS21-12',
  website: 'http://apple.com',
  comment: 'Good company',
  profile: 'Good profile',
  logoId: newLogo.id,
  name: 'New Company',
  email: 'create@gmail.com',
};

export const updateCompanyResponse = (id) => ({
  result: true,
  company: {
    id,
    address: 'Some address',
    name: 'New Company',
  },
});
