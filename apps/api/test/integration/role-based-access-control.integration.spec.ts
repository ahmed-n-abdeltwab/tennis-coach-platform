import { Role } from '@prisma/client';

import { AccountsModule } from '../../src/app/accounts/accounts.module';
import { AnalyticsModule } from '../../src/app/analytics/analytics.module';
import { CustomServicesModule } from '../../src/app/custom-services/custom-services.module';
import { IamModule } from '../../src/app/iam/iam.module';
import { IntegrationTest } from '../utils';

/**
 * Role-Based Access Control Integration Tests
 * Tests that API endpoints properly enforce role-based access restrictions
 * and return 403 Forbidden for unauthorized role access
 */
describe('Role-Based Access Control Integration', () => {
  let test: IntegrationTest;
  let userToken: string;
  let coachToken: string;
  let adminToken: string;

  beforeAll(async () => {
    test = new IntegrationTest({
      modules: [AccountsModule, IamModule, AnalyticsModule, CustomServicesModule],
    });
    await test.setup();
  });

  afterAll(async () => {
    await test.cleanup();
  });

  beforeEach(async () => {
    // Clean database before each test
    await test.db.cleanupDatabase();

    // Create test users with different roles
    const user = await test.db.createTestUser();
    const coach = await test.db.createTestCoach();
    const admin = await test.db.createTestUser({ role: Role.ADMIN });

    // Create tokens for each role
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

  describe('Admin-Only Endpoints', () => {
    describe('GET /api/analytics/system', () => {
      it('should allow admin access', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/system', adminToken);
        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
        }
      });

      it('should deny coach access with 403', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/system', coachToken);
        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });

      it('should deny user access with 403', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/system', userToken);
        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });
    });

    describe('GET /api/analytics/growth', () => {
      it('should allow admin access', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/growth', adminToken);
        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
        }
      });

      it('should deny coach access with 403', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/growth', coachToken);
        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });

      it('should deny user access with 403', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/growth', userToken);
        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });
    });
  });

  describe('Coach and Admin Endpoints', () => {
    describe('GET /api/accounts', () => {
      it('should allow admin access to user list', async () => {
        const response = await test.http.authenticatedGet('/api/accounts', adminToken);
        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(true);
        }
      });

      it('should allow coach access to user list', async () => {
        const response = await test.http.authenticatedGet('/api/accounts', coachToken);
        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(true);
        }
      });

      it('should deny user access with 403', async () => {
        const response = await test.http.authenticatedGet('/api/accounts', userToken);
        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });
    });
  });

  describe('Coach-Only Endpoints', () => {
    describe('GET /api/analytics/dashboard', () => {
      it('should allow coach access', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/dashboard', coachToken);
        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
        }
      });

      it('should allow admin access', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/dashboard', adminToken);
        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
        }
      });

      it('should deny user access with 403', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/dashboard', userToken);
        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });
    });

    describe('GET /api/analytics/realtime', () => {
      it('should allow coach access', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/realtime', coachToken);
        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
        }
      });

      it('should allow admin access', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/realtime', adminToken);
        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
        }
      });

      it('should deny user access with 403', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/realtime', userToken);
        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });
    });
  });

  describe('User-Accessible Endpoints', () => {
    describe('GET /api/accounts/me', () => {
      it('should allow user access', async () => {
        const response = await test.http.authenticatedGet('/api/accounts/me', userToken);
        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
        }
      });

      it('should allow coach access', async () => {
        const response = await test.http.authenticatedGet('/api/accounts/me', coachToken);
        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
        }
      });

      it('should allow admin access', async () => {
        const response = await test.http.authenticatedGet('/api/accounts/me', adminToken);
        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
        }
      });
    });
  });

  describe('Unauthenticated Access', () => {
    it('should deny access to protected endpoints without token', async () => {
      const response = await test.http.get('/api/accounts/me');
      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBeGreaterThanOrEqual(401);
      }
    });

    it('should deny access to admin endpoints without token', async () => {
      const response = await test.http.get('/api/analytics/system');
      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBeGreaterThanOrEqual(401);
      }
    });
  });
});
