import { registerDecorator, ValidationOptions } from 'class-validator';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export function IsValidPhoneNumber(validationOptions?: ValidationOptions) {
  return function(object, propertyName: string) {
    registerDecorator({
      name: 'IsValidPhoneNumber',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (!value || typeof value !== 'string') {
            return false;
          }

          const parsedNumber = parsePhoneNumberFromString(value);
          return parsedNumber && parsedNumber.isValid();
        },
      },
    });
  };
}
