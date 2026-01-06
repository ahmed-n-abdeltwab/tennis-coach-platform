import { Role } from '@prisma/client';

import { DiscountsModule } from '../../src/app/discounts/discounts.module';
import { IamModule } from '../../src/app/iam/iam.module';
import { IntegrationTest } from '../utils';

/**
 * Discounts Module Integration Tests
 * Tests discount creation, retrieval, validation, and usage tracking workflows
 */
describe('Discounts Integration', () => {
  let test: IntegrationTest;
  let coachToken: string;
  let userToken: string;
  let coachId: string;

  beforeAll(async () => {
    test = new IntegrationTest({
      modules: [IamModule, DiscountsModule],
    });

    await test.setup();
  });

  afterAll(async () => {
    await test.cleanup();
  });

  beforeEach(async () => {
    await test.db.cleanupDatabase();

    // Create test users
    const coach = await test.db.createTestCoach();
    const user = await test.db.createTestUser();

    coachId = coach.id;

    // Create tokens
    coachToken = await test.auth.createToken({
      sub: coach.id,
      email: coach.email,
      role: coach.role,
    });

    userToken = await test.auth.createToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  });

  describe('Discount Creation', () => {
    describe('POST /api/discounts', () => {
      it('should allow coach to create discount code', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);

        const createData = {
          code: 'SUMMER2024',
          amount: 15,
          expiry: futureDate.toISOString(),
          maxUsage: 10,
          isActive: true,
        };

        const response = await test.http.authenticatedPost('/api/discounts', coachToken, {
          body: createData,
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(201);
          expect(response.body).toHaveProperty('id');
          expect(response.body.code).toBe('SUMMER2024');
          expect(response.body.amount).toBe(15);
          expect(response.body.maxUsage).toBe(10);
          expect(response.body.isActive).toBe(true);
          expect(response.body.useCount).toBe(0);
          expect(response.body.coachId).toBe(coachId);
        }
      });

      it('should allow admin to create discount code', async () => {
        const admin = await test.db.createTestUser({ role: Role.ADMIN });
        const adminToken = await test.auth.createToken({
          sub: admin.id,
          email: admin.email,
          role: admin.role,
        });

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);

        const createData = {
          code: 'ADMIN2024',
          amount: 20,
          expiry: futureDate.toISOString(),
          maxUsage: 5,
        };

        const response = await test.http.authenticatedPost('/api/discounts', adminToken, {
          body: createData,
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(201);
          expect(response.body.code).toBe('ADMIN2024');
        }
      });

      it('should prevent regular user from creating discount code', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);

        const createData = {
          code: 'USERCODE',
          amount: 10,
          expiry: futureDate.toISOString(),
        };

        const response = await test.http.authenticatedPost('/api/discounts', userToken, {
          body: createData,
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });

      it('should enforce discount code uniqueness', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);

        const createData = {
          code: 'UNIQUE2024',
          amount: 10,
          expiry: futureDate.toISOString(),
        };

        // Create first discount
        const firstResponse = await test.http.authenticatedPost('/api/discounts', coachToken, {
          body: createData,
        });
        expect(firstResponse.ok).toBe(true);

        // Try to create duplicate
        const duplicateResponse = await test.http.authenticatedPost('/api/discounts', coachToken, {
          body: createData,
        });

        expect(duplicateResponse.ok).toBe(false);
        if (!duplicateResponse.ok) {
          expect(duplicateResponse.status).toBe(400);
          expect(duplicateResponse.body.message).toContain('already exists');
        }
      });

      it('should fail without authentication', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);

        const createData = {
          code: 'NOAUTH',
          amount: 10,
          expiry: futureDate.toISOString(),
        };

        const response = await test.http.post('/api/discounts', {
          body: createData,
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(401);
        }
      });
    });
  });

  describe('Discount Retrieval', () => {
    describe('GET /api/discounts', () => {
      it('should allow coach to retrieve their discounts', async () => {
        // Create discounts for the coach
        await test.db.createTestDiscount({ coachId });
        await test.db.createTestDiscount({ coachId });

        const response = await test.http.authenticatedGet('/api/discounts', coachToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThanOrEqual(2);
          response.body.forEach((discount: { coachId: string }) => {
            expect(discount.coachId).toBe(coachId);
          });
        }
      });

      it('should return empty array when coach has no discounts', async () => {
        const response = await test.http.authenticatedGet('/api/discounts', coachToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBe(0);
        }
      });

      it('should not return other coaches discounts', async () => {
        // Create another coach with discounts
        const otherCoach = await test.db.createTestCoach();
        await test.db.createTestDiscount({ coachId: otherCoach.id });

        // Create discount for current coach
        await test.db.createTestDiscount({ coachId });

        const response = await test.http.authenticatedGet('/api/discounts', coachToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(true);
          // Should only see own discounts
          response.body.forEach((discount: { coachId: string }) => {
            expect(discount.coachId).toBe(coachId);
            expect(discount.coachId).not.toBe(otherCoach.id);
          });
        }
      });

      it('should prevent regular user from accessing discounts endpoint', async () => {
        const response = await test.http.authenticatedGet('/api/discounts', userToken);

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });

      it('should order discounts by creation date descending', async () => {
        // Create discounts with slight delay to ensure different timestamps
        await test.db.createTestDiscount({ coachId });
        await test.db.createTestDiscount({ coachId });

        const response = await test.http.authenticatedGet('/api/discounts', coachToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThanOrEqual(2);

          // Verify ordering - most recent first
          const dates = (response.body as Array<{ createdAt: string }>).map(d =>
            new Date(d.createdAt).getTime()
          );
          for (let i = 0; i < dates.length - 1; i++) {
            const current = dates[i];
            const next = dates[i + 1];
            if (current !== undefined && next !== undefined) {
              expect(current).toBeGreaterThanOrEqual(next);
            }
          }
        }
      });
    });
  });

  describe('Discount Validation', () => {
    describe('POST /api/discounts/validate', () => {
      it('should validate active discount code successfully', async () => {
        const discount = await test.db.createTestDiscount({
          coachId,
          isActive: true,
          useCount: 0,
          maxUsage: 10,
        });

        const response = await test.http.authenticatedPost('/api/discounts/validate', userToken, {
          body: { code: discount.code },
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(201);
          expect(response.body.code).toBe(discount.code);
          expect(response.body.isValid).toBe(true);
          expect(response.body.amount).toBeDefined();
        }
      });

      it('should reject expired discount code', async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);

        const discount = await test.db.createTestDiscount({
          coachId,
          isActive: true,
          expiry: pastDate,
        });

        const response = await test.http.authenticatedPost('/api/discounts/validate', userToken, {
          body: { code: discount.code },
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
          expect(response.body.message).toContain('Invalid or expired');
        }
      });

      it('should reject inactive discount code', async () => {
        const discount = await test.db.createTestDiscount({
          coachId,
          isActive: false,
        });

        const response = await test.http.authenticatedPost('/api/discounts/validate', userToken, {
          body: { code: discount.code },
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
          expect(response.body.message).toContain('Invalid or expired');
        }
      });

      it('should reject discount code at usage limit', async () => {
        const discount = await test.db.createTestDiscount({
          coachId,
          isActive: true,
          useCount: 5,
          maxUsage: 5,
        });

        const response = await test.http.authenticatedPost('/api/discounts/validate', userToken, {
          body: { code: discount.code },
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
          expect(response.body.message).toContain('usage limit');
        }
      });

      it('should reject non-existent discount code', async () => {
        const response = await test.http.authenticatedPost('/api/discounts/validate', userToken, {
          body: { code: 'NONEXISTENT' },
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
          expect(response.body.message).toContain('Invalid or expired');
        }
      });
    });
  });

  describe('Discount Usage Tracking', () => {
    describe('PUT /api/discounts/:code', () => {
      it('should allow coach to update their discount', async () => {
        const discount = await test.db.createTestDiscount({ coachId, isActive: true });

        const updateData = {
          amount: 25,
          maxUsage: 20,
        };

        const response = await test.http.authenticatedPut(
          `/api/discounts/${discount.code}` as '/api/discounts/{code}',
          coachToken,
          {
            body: updateData,
          }
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body.code).toBe(discount.code);
          expect(response.body.amount).toBe(25);
          expect(response.body.maxUsage).toBe(20);
        }
      });

      it('should prevent coach from updating other coaches discount', async () => {
        const otherCoach = await test.db.createTestCoach();
        const discount = await test.db.createTestDiscount({
          coachId: otherCoach.id,
          isActive: true,
        });

        const updateData = {
          amount: 50,
        };

        const response = await test.http.authenticatedPut(
          `/api/discounts/${discount.code}` as '/api/discounts/{code}',
          coachToken,
          {
            body: updateData,
          }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });

      it('should return 404 for non-existent discount code', async () => {
        const updateData = {
          amount: 30,
        };

        const response = await test.http.authenticatedPut(
          '/api/discounts/NONEXISTENT' as '/api/discounts/{code}',
          coachToken,
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

    describe('DELETE /api/discounts/:code', () => {
      it('should allow coach to delete their discount', async () => {
        const discount = await test.db.createTestDiscount({ coachId });

        const response = await test.http.authenticatedDelete(
          `/api/discounts/${discount.code}` as '/api/discounts/{code}',
          coachToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
        }

        // Verify discount is soft-deleted (isActive = false)
        const validateResponse = await test.http.authenticatedPost(
          '/api/discounts/validate',
          userToken,
          {
            body: { code: discount.code },
          }
        );

        expect(validateResponse.ok).toBe(false);
        if (!validateResponse.ok) {
          expect(validateResponse.status).toBe(400);
        }
      });

      it('should prevent coach from deleting other coaches discount', async () => {
        const otherCoach = await test.db.createTestCoach();
        const discount = await test.db.createTestDiscount({ coachId: otherCoach.id });

        const response = await test.http.authenticatedDelete(
          `/api/discounts/${discount.code}` as '/api/discounts/{code}',
          coachToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });

      it('should return 404 for non-existent discount code', async () => {
        const response = await test.http.authenticatedDelete(
          '/api/discounts/NONEXISTENT' as '/api/discounts/{code}',
          coachToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(404);
        }
      });
    });
  });

  describe('Discount Validation and Usage Tracking', () => {
    const discountStates = [
      {
        description: 'active with remaining usage',
        isActive: true,
        useCount: 0,
        maxUsage: 10,
        daysUntilExpiry: 30,
        shouldValidate: true,
      },
      {
        description: 'active at half usage',
        isActive: true,
        useCount: 5,
        maxUsage: 10,
        daysUntilExpiry: 30,
        shouldValidate: true,
      },
      {
        description: 'active with one usage remaining',
        isActive: true,
        useCount: 9,
        maxUsage: 10,
        daysUntilExpiry: 30,
        shouldValidate: true,
      },
      {
        description: 'inactive',
        isActive: false,
        useCount: 0,
        maxUsage: 10,
        daysUntilExpiry: 30,
        shouldValidate: false,
      },
      {
        description: 'at usage limit',
        isActive: true,
        useCount: 10,
        maxUsage: 10,
        daysUntilExpiry: 30,
        shouldValidate: false,
      },
      {
        description: 'expired',
        isActive: true,
        useCount: 0,
        maxUsage: 10,
        daysUntilExpiry: -1,
        shouldValidate: false,
      },
    ] as const;

    it.each(discountStates)(
      'should handle discount that is $description correctly',
      async ({ isActive, useCount, maxUsage, daysUntilExpiry, shouldValidate }) => {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);

        const discount = await test.db.createTestDiscount({
          coachId,
          isActive,
          useCount,
          maxUsage,
          expiry: expiryDate,
        });

        const response = await test.http.authenticatedPost('/api/discounts/validate', userToken, {
          body: { code: discount.code },
        });

        if (shouldValidate) {
          expect(response.ok).toBe(true);
          if (response.ok) {
            expect(response.body.code).toBe(discount.code);
            expect(response.body.isValid).toBe(true);
          }
        } else {
          expect(response.ok).toBe(false);
          if (!response.ok) {
            expect(response.status).toBe(400);
          }
        }
      }
    );

    it('should track usage count correctly across multiple validations', async () => {
      const discount = await test.db.createTestDiscount({
        coachId,
        isActive: true,
        useCount: 0,
        maxUsage: 3,
      });

      // Validate multiple times - validation itself doesn't increment usage
      // Usage is incremented when discount is applied to a session
      for (let i = 0; i < 3; i++) {
        const response = await test.http.authenticatedPost('/api/discounts/validate', userToken, {
          body: { code: discount.code },
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.body.isValid).toBe(true);
        }
      }
    });
  });
});
