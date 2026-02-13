import { FORM_ERRORS } from '@flact/constants';
import { BadRequestError } from '@flact/exceptions';
import validator from 'validator';

export const normalizeEmail = (email: string): string => {
  const resultEmail = validator.normalizeEmail(email);
  if (!resultEmail) {
    throw new BadRequestError([{ field: 'email', message: FORM_ERRORS.FIELD_INVALID_EMAIL }]);
  }
  return resultEmail;
};
