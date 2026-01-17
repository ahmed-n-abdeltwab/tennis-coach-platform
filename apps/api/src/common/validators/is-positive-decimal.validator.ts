import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Validator constraint for positive decimal strings
 */
@ValidatorConstraint({ name: 'isPositiveDecimal', async: false })
export class IsPositiveDecimalConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    // Check if it's a valid decimal format using a safer approach
    // Match: optional minus, digits, optional decimal point with digits
    if (!/^-?\d+$/.test(value) && !/^-?\d+\.\d+$/.test(value)) {
      return false;
    }

    // Check if it's positive (greater than 0, not zero)
    const numValue = parseFloat(value);
    return !isNaN(numValue) && numValue > 0;
  }

  defaultMessage(): string {
    return 'Value must be a positive decimal number greater than zero (e.g., "99.99")';
  }
}

/**
 * Decorator to validate that a string represents a positive decimal number
 *
 * @param validationOptions - Optional validation options
 *
 * @example
 * ```typescript
 * class CreateProductDto {
 *   @IsPositiveDecimal()
 *   price: string;
 * }
 * ```
 */
export function IsPositiveDecimal(validationOptions?: ValidationOptions) {
  return function (target: object, propertyName: string): void {
    registerDecorator({
      target: target.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPositiveDecimalConstraint,
    });
  };
}
