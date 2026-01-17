import { Role } from '@prisma/client';

import { AccountsModule } from '../../src/app/accounts/accounts.module';
import { IamModule } from '../../src/app/iam/iam.module';
import { IntegrationTest } from '../utils';

/**
 * Accounts Module Integration Tests
 * Tests account creation, retrieval, update, and deletion workflows
 */
describe('Accounts Integration', () => {
  let test: IntegrationTest;
  let userToken: string;
  let coachToken: string;
  let adminToken: string;

  beforeAll(async () => {
    test = new IntegrationTest({
      modules: [AccountsModule, IamModule],
    });
    await test.setup();
  });

  afterAll(async () => {
    await test.cleanup();
  });

  beforeEach(async () => {
    // Clean database before each test
    await test.db.cleanupDatabase();

    // Create test users
    const user = await test.db.createTestUser();
    const coach = await test.db.createTestCoach();
    const admin = await test.db.createTestUser({ role: Role.ADMIN });

    // Create tokens
    userToken = await test.auth.createToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    coachToken = await test.auth.createToken({
      sub: coach.id,
      email: coach.email,
      role: coach.role,
    });

    adminToken = await test.auth.createToken({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    });
  });

  describe('Account Retrieval Workflows', () => {
    describe('GET /api/accounts/me', () => {
      it('should retrieve current user account', async () => {
        const response = await test.http.authenticatedGet('/api/accounts/me', userToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('email');
          expect(response.body).toHaveProperty('name');
          expect(response.body).toHaveProperty('role');
          expect(response.body).not.toHaveProperty('passwordHash');
        }
      });

      it('should retrieve current coach account', async () => {
        const response = await test.http.authenticatedGet('/api/accounts/me', coachToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('id');
          expect(response.body.role).toBe(Role.COACH);
        }
      });

      it('should fail without authentication', async () => {
        const response = await test.http.get('/api/accounts/me');

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(401);
        }
      });
    });

    describe('GET /api/accounts/:id', () => {
      it('should retrieve account by ID for own account', async () => {
        const user = await test.db.createTestUser();
        const token = await test.auth.createToken({
          sub: user.id,
          email: user.email,
          role: user.role,
        });

        const response = await test.http.authenticatedGet(
          `/api/accounts/${user.id}` as '/api/accounts/{id}',
          token
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body.id).toBe(user.id);
          expect(response.body.email).toBe(user.email);
        }
      });

      it('should allow admin to retrieve any account by ID', async () => {
        const user = await test.db.createTestUser();

        const response = await test.http.authenticatedGet(
          `/api/accounts/${user.id}` as '/api/accounts/{id}',
          adminToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body.id).toBe(user.id);
        }
      });

      it('should prevent non-admin users from accessing other accounts', async () => {
        const otherUser = await test.db.createTestUser();

        const response = await test.http.authenticatedGet(
          `/api/accounts/${otherUser.id}` as '/api/accounts/{id}',
          userToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          // User should get their own account, not the requested one
          expect(response.body.id).not.toBe(otherUser.id);
        }
      });

      it('should return 404 for non-existent account', async () => {
        const response = await test.http.authenticatedGet(
          '/api/accounts/cnonexistentaccount123' as any,
          adminToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(404);
          expect(response.body.message).toContain('not found');
        }
      });
    });

    describe('GET /api/accounts', () => {
      it('should list all accounts for admin', async () => {
        // Create multiple users
        await test.db.createTestUsers(3);

        const response = await test.http.authenticatedGet('/api/accounts', adminToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThan(0);
        }
      });

      it('should allow coach to list accounts', async () => {
        const response = await test.http.authenticatedGet('/api/accounts', coachToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(true);
        }
      });

      it('should prevent regular users from listing all accounts', async () => {
        const response = await test.http.authenticatedGet('/api/accounts', userToken);

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(403);
        }
      });
    });
  });

  describe('Account Update Workflows', () => {
    describe('PATCH /api/accounts/:id', () => {
      it('should allow user to update own account', async () => {
        const user = await test.db.createTestUser();
        const token = await test.auth.createToken({
          sub: user.id,
          email: user.email,
          role: user.role,
        });

        const updateData = {
          name: 'Updated Name',
          bio: 'Updated bio',
        };

        const response = await test.http.authenticatedPatch(
          `/api/accounts/${user.id}` as '/api/accounts/{id}',
          token,
          {
            body: updateData,
          }
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body.name).toBe(updateData.name);
          expect(response.body.bio).toBe(updateData.bio);
        }
      });

      it('should allow admin to update any account', async () => {
        const user = await test.db.createTestUser();

        const updateData = {
          name: 'Admin Updated Name',
        };

        const response = await test.http.authenticatedPatch(
          `/api/accounts/${user.id}` as '/api/accounts/{id}',
          adminToken,
          {
            body: updateData,
          }
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body.name).toBe(updateData.name);
        }
      });

      it('should prevent non-admin users from updating other accounts', async () => {
        const otherUser = await test.db.createTestUser();

        const updateData = {
          name: 'Unauthorized Update',
        };

        const response = await test.http.authenticatedPatch(
          `/api/accounts/${otherUser.id}` as '/api/accounts/{id}',
          userToken,
          {
            body: updateData,
          }
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          // User should update their own account, not the requested one
          expect(response.body.id).not.toBe(otherUser.id);
        }
      });

      it('should return 404 when updating non-existent account', async () => {
        const updateData = {
          name: 'Updated Name',
        };

        const response = await test.http.authenticatedPatch(
          '/api/accounts/cnonexistentaccount123' as any,
          adminToken,
          {
            body: updateData,
          }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(404);
        }
      });
    });
  });

  describe('Account Deletion Workflows', () => {
    describe('DELETE /api/accounts/:id', () => {
      it('should allow admin to delete account', async () => {
        const user = await test.db.createTestUser();

        const response = await test.http.authenticatedDelete(
          `/api/accounts/${user.id}` as '/api/accounts/{id}',
          adminToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
        }

        // Verify account is deleted
        const verifyResponse = await test.http.authenticatedGet(
          `/api/accounts/${user.id}` as '/api/accounts/{id}',
          adminToken
        );
        expect(verifyResponse.ok).toBe(false);
      });

      it('should allow coach to delete account', async () => {
        const user = await test.db.createTestUser();

        const response = await test.http.authenticatedDelete(
          `/api/accounts/${user.id}` as '/api/accounts/{id}',
          coachToken
        );

        if (response.ok) {
          expect(response.status).toBe(200);
        } else {
          fail(`Expected success but got error: ${response.body.message}`);
        }
      });

      it('should prevent regular users from deleting accounts', async () => {
        const otherUser = await test.db.createTestUser();

        const response = await test.http.authenticatedDelete(
          `/api/accounts/${otherUser.id}` as '/api/accounts/{id}',
          userToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(403);
        }
      });

      it('should return 404 when deleting non-existent account', async () => {
        const response = await test.http.authenticatedDelete(
          '/api/accounts/cnonexistentaccount123' as any,
          adminToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(404);
        }
      });
    });
  });

  describe('Role-Based Account Listing Access', () => {
    const roleTestCases = [
      { role: Role.ADMIN, shouldHaveAccess: true, description: 'ADMIN' },
      { role: Role.COACH, shouldHaveAccess: true, description: 'COACH' },
      { role: Role.USER, shouldHaveAccess: false, description: 'USER' },
    ] as const;

    it.each(roleTestCases)(
      'should $description role $shouldHaveAccess access to account listing',
      async ({ role, shouldHaveAccess }) => {
        // Create a user with the specified role
        const account = await test.db.createTestUser({ role });
        const token = await test.auth.createToken({
          sub: account.id,
          email: account.email,
          role,
        });

        const response = await test.http.authenticatedGet('/api/accounts', token);

        if (shouldHaveAccess) {
          expect(response.ok).toBe(true);
          if (response.ok) {
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
          }
        } else {
          expect(response.ok).toBe(false);
          if (!response.ok) {
            expect(response.status).toBe(403);
          }
        }
      }
    );
  });

  describe('Resource Ownership Authorization', () => {
    describe('Account Access Authorization', () => {
      const accessTestCases = [
        { isOwner: true, isAdmin: false, description: 'owner accessing own account' },
        { isOwner: false, isAdmin: true, description: 'admin accessing other account' },
        {
          isOwner: false,
          isAdmin: false,
          description: 'non-owner non-admin accessing other account',
        },
      ] as const;

      it.each(accessTestCases)(
        'should handle $description correctly for GET',
        async ({ isOwner, isAdmin }) => {
          // Create target account
          const targetAccount = await test.db.createTestUser();

          // Create requesting user
          let requestingAccount;
          if (isOwner) {
            requestingAccount = targetAccount;
          } else if (isAdmin) {
            requestingAccount = await test.db.createTestUser({ role: Role.ADMIN });
          } else {
            requestingAccount = await test.db.createTestUser();
          }

          const token = await test.auth.createToken({
            sub: requestingAccount.id,
            email: requestingAccount.email,
            role: requestingAccount.role,
          });

          const response = await test.http.authenticatedGet(
            `/api/accounts/${targetAccount.id}` as '/api/accounts/{id}',
            token
          );

          expect(response.ok).toBe(true);
          if (response.ok) {
            if (isOwner || isAdmin) {
              // Owner or admin should get the target account
              expect(response.body.id).toBe(targetAccount.id);
            } else {
              // Non-owner non-admin gets their own account (API behavior)
              expect(response.body.id).toBe(requestingAccount.id);
            }
          }
        }
      );

      it.each(accessTestCases)(
        'should handle $description correctly for PATCH',
        async ({ isOwner, isAdmin }) => {
          // Create target account
          const targetAccount = await test.db.createTestUser();

          // Create requesting user
          let requestingAccount;
          if (isOwner) {
            requestingAccount = targetAccount;
          } else if (isAdmin) {
            requestingAccount = await test.db.createTestUser({ role: Role.ADMIN });
          } else {
            requestingAccount = await test.db.createTestUser();
          }

          const token = await test.auth.createToken({
            sub: requestingAccount.id,
            email: requestingAccount.email,
            role: requestingAccount.role,
          });

          const updateData = { name: 'Updated Name' };

          const response = await test.http.authenticatedPatch(
            `/api/accounts/${targetAccount.id}` as '/api/accounts/{id}',
            token,
            { body: updateData }
          );

          expect(response.ok).toBe(true);
          if (response.ok) {
            if (isOwner || isAdmin) {
              // Owner or admin should update the target account
              expect(response.body.id).toBe(targetAccount.id);
              expect(response.body.name).toBe(updateData.name);
            } else {
              // Non-owner non-admin updates their own account (API behavior)
              expect(response.body.id).toBe(requestingAccount.id);
            }
          }
        }
      );
    });

    describe('Account Deletion Authorization', () => {
      const deleteTestCases = [
        { role: Role.ADMIN, shouldSucceed: true, description: 'ADMIN' },
        { role: Role.COACH, shouldSucceed: true, description: 'COACH' },
        { role: Role.USER, shouldSucceed: false, description: 'USER' },
      ] as const;

      it.each(deleteTestCases)(
        'should $description role $shouldSucceed delete other accounts',
        async ({ role, shouldSucceed }) => {
          // Create target account to delete
          const targetAccount = await test.db.createTestUser();

          // Create requesting user with specified role
          const requestingAccount = await test.db.createTestUser({ role });
          const token = await test.auth.createToken({
            sub: requestingAccount.id,
            email: requestingAccount.email,
            role,
          });

          const response = await test.http.authenticatedDelete(
            `/api/accounts/${targetAccount.id}` as '/api/accounts/{id}',
            token
          );

          if (shouldSucceed) {
            expect(response.ok).toBe(true);
            if (response.ok) {
              expect(response.status).toBe(200);
            }
          } else {
            expect(response.ok).toBe(false);
            if (!response.ok) {
              expect(response.status).toBe(403);
            }
          }
        }
      );
    });
  });
});
