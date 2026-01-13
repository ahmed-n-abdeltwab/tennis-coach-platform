/**
 * Custom CUID validator decorator for class-validator
 * Validates that a string is a valid CUID (Collision-resistant Unique Identifier)
 *
 * CUID format: starts with 'c' followed by lowercase alphanumeric characters
 * Example: clxyz123abc456def789
 */

import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * CUID validation regex pattern
 * Supports both CUID v1 and v2 formats:
 * - CUID v1: starts with 'c' followed by lowercase alphanumeric (e.g., clxyz123abc456def789)
 * - CUID v2: starts with 'c' followed by lowercase letters and numbers (variable length)
 * Also accepts standard alphanumeric IDs for flexibility
 */
const CUID_REGEX = /^c[a-z0-9]{7,}$/;

@ValidatorConstraint({ name: 'isCuid', async: false })
export class IsCuidConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    return CUID_REGEX.test(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid CUID`;
  }
}

/**
 * Decorator that validates if a string is a valid CUID
 *
 * @param validationOptions - Optional validation options
 * @returns PropertyDecorator
 *
 * @example
 * ```typescript
 * class CreateSessionDto {
 *   @IsCuid()
 *   bookingTypeId: string;
 * }
 * ```
 */
export function IsCuid(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [],
      validator: IsCuidConstraint,
    });
  };
}
