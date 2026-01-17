import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * Request DTO for initiating password reset.
 * Sends a reset token to the user's email.
 */
export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address associated with the account',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

/**
 * Response DTO for forgot password request.
 * Always returns success to prevent email enumeration.
 */
export class ForgotPasswordResponseDto {
  @ApiProperty({
    example: 'If an account exists with this email, a password reset link has been sent.',
    description: 'Generic success message (does not reveal if email exists)',
  })
  @IsString()
  message: string;
}

/**
 * Request DTO for resetting password with token.
 */
export class ResetPasswordDto {
  @ApiProperty({
    example: 'abc123-reset-token',
    description: 'Password reset token received via email',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: 'newPassword123',
    minLength: 6,
    description: 'New password (minimum 6 characters)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}

/**
 * Response DTO for successful password reset.
 */
export class ResetPasswordResponseDto {
  @ApiProperty({
    example: 'Password has been reset successfully.',
    description: 'Success message after password reset',
  })
  @IsString()
  message: string;
}
