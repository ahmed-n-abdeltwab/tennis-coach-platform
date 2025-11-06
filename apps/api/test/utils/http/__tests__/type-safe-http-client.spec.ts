/**
 * TypeSafeHttpClient Type Inference Tests
 *
 * This test file verifies that TypeSafeHttpClient properly infers response types
 * from the Endpoints interface without requiring explicit type parameters.
 *
 * These are primarily compile-time tests - if the file compiles without TypeScript
 * errors, it demonstrates that type inference is working correctly.
 */

import { Endpoints, ExtractResponseType } from '@routes-helpers';
import { TypedResponse } from '../type-safe-http-client';

describe('TypeSafeHttpClient - Type Inference (Compile-Time Tests)', () => {
  /**
   * These tests verify type inference at compile time.
   * The fact that this file compiles without errors proves that:
   * 1. Response types are properly inferred from Endpoints interface
   * 2. TypedResponse<T> is correctly typed (not TypedResponse<unknown>)
   * 3. All method-specific functions (get, post, put, delete, patch) work correctly
   */

  it('should compile with proper type inference for POST requests', () => {
    // This is a compile-time test
    // If this compiles, type inference is working

    type SignupResponseType = ExtractResponseType<Endpoints, '/api/authentication/signup', 'POST'>;
    type LoginResponseType = ExtractResponseType<
      Endpoints,
      '/api/authentication/user/login',
      'POST'
    >;

    // These types should be properly inferred, not unknown
    const assertSignupHasAccessToken: (response: SignupResponseType) => string = response =>
      response.accessToken;

    const assertLoginHasAccount: (response: LoginResponseType) => {
      id: string;
      email: string;
    } = response => response.account;

    expect(assertSignupHasAccessToken).toBeDefined();
    expect(assertLoginHasAccount).toBeDefined();
  });

  it('should compile with proper type inference for GET requests', () => {
    // Compile-time test for GET request types

    type AccountMeResponseType = ExtractResponseType<Endpoints, '/api/accounts/me', 'GET'>;

    // Should be able to access all account fields
    const assertAccountHasFields: (response: AccountMeResponseType) => {
      id: string;
      email: string;
      name: string;
      role: 'USER' | 'PREMIUM_USER' | 'ADMIN' | 'COACH';
      createdAt: string;
      updatedAt: string;
    } = response => ({
      id: response.id,
      email: response.email,
      name: response.name,
      role: response.role,
      createdAt: response.createdAt,
      updatedAt: response.updatedAt,
    });

    expect(assertAccountHasFields).toBeDefined();
  });

  it('should compile with proper type inference for PATCH requests', () => {
    // Compile-time test for PATCH request types

    type AccountUpdateResponseType = ExtractResponseType<Endpoints, '/api/accounts/{id}', 'PATCH'>;

    // Should be able to access updated account fields
    const assertPatchResponse: (response: AccountUpdateResponseType) => {
      id: string;
      name: string;
      email: string;
    } = response => ({
      id: response.id,
      name: response.name,
      email: response.email,
    });

    expect(assertPatchResponse).toBeDefined();
  });

  it('should compile with TypedResponse properly typed', () => {
    // Verify that TypedResponse<T> is not TypedResponse<unknown>

    type SignupResponse = TypedResponse<
      ExtractResponseType<Endpoints, '/api/authentication/signup', 'POST'>
    >;

    // Should be able to access body with proper typing
    const assertTypedResponse: (response: SignupResponse) => {
      accessToken: string;
      refreshToken: string;
    } = response => ({
      accessToken: response.body.accessToken,
      refreshToken: response.body.refreshToken,
    });

    expect(assertTypedResponse).toBeDefined();
  });

  it('should demonstrate that response.body is NOT unknown', () => {
    // This test proves that response.body has proper typing
    // If response.body was unknown, these type assertions would fail to compile

    type LoginResponse = ExtractResponseType<Endpoints, '/api/authentication/user/login', 'POST'>;

    // These should all compile without errors
    const accessTokenIsString: (response: LoginResponse) => string = response =>
      response.accessToken;

    const accountHasEmail: (response: LoginResponse) => string = response => response.account.email;

    const accountHasRole: (
      response: LoginResponse
    ) => 'USER' | 'PREMIUM_USER' | 'ADMIN' | 'COACH' = response => response.account.role;

    expect(accessTokenIsString).toBeDefined();
    expect(accountHasEmail).toBeDefined();
    expect(accountHasRole).toBeDefined();
  });

  it('should handle optional fields correctly', () => {
    // Verify that optional fields are properly typed

    type AccountResponse = ExtractResponseType<Endpoints, '/api/accounts/me', 'GET'>;

    // Optional fields should be typed as T | undefined
    const assertOptionalFields: (response: AccountResponse) => {
      bio: string | undefined;
      age: number | undefined;
      profileImage: string | undefined;
    } = response => ({
      bio: response.bio,
      age: response.age,
      profileImage: response.profileImage,
    });

    expect(assertOptionalFields).toBeDefined();
  });
});
