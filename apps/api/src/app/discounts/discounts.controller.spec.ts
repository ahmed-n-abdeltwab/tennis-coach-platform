import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { ControllerTest } from '@test-utils';
import { DeepMocked } from '@test-utils/mixins/mock.mixin';

import { DiscountsController } from './discounts.controller';
import { DiscountsService } from './discounts.service';

interface DiscountsControllerMocks {
  DiscountsService: DeepMocked<DiscountsService>;
}

describe('DiscountsController', () => {
  let test: ControllerTest<DiscountsController, DiscountsControllerMocks, 'discounts'>;

  beforeEach(async () => {
    test = new ControllerTest({
      controller: DiscountsController,
      moduleName: 'discounts',
      providers: [DiscountsService],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('POST /discounts/validate', () => {
    it('should validate a discount code', async () => {
      const validateDto = { code: 'SUMMER2024' };
      const expectedResponse = {
        code: 'SUMMER2024',
        amount: new Decimal(10),
        isValid: true,
      };
      test.mocks.DiscountsService.validateCode.mockResolvedValue(expectedResponse);

      const userToken = await test.auth.createToken({ role: Role.USER });
      await test.http.authenticatedPost('/api/discounts/validate', userToken, {
        body: validateDto,
      });

      expect(test.mocks.DiscountsService.validateCode).toHaveBeenCalledWith('SUMMER2024');
    });
  });

  describe('GET /discounts', () => {
    it('should return all discounts for the authenticated coach', async () => {
      const mockDiscounts = [
        test.factory.discount.createWithNulls({ code: 'DISCOUNT1', coachId: 'coach-123' }),
        test.factory.discount.createWithNulls({ code: 'DISCOUNT2', coachId: 'coach-123' }),
      ];
      test.mocks.DiscountsService.findByCoach.mockResolvedValue(mockDiscounts);

      const coachToken = await test.auth.createToken({ role: Role.COACH, sub: 'coach-123' });
      await test.http.moduleAuthenticatedGet('/api/discounts/coach', coachToken);

      expect(test.mocks.DiscountsService.findByCoach).toHaveBeenCalledWith('coach-123');
    });

    it('should return empty array when coach has no discounts', async () => {
      test.mocks.DiscountsService.findByCoach.mockResolvedValue([]);

      const coachToken = await test.auth.createToken({ role: Role.COACH, sub: 'coach-456' });
      await test.http.moduleAuthenticatedGet('/api/discounts/coach', coachToken);

      expect(test.mocks.DiscountsService.findByCoach).toHaveBeenCalledWith('coach-456');
    });
  });

  describe('POST /discounts', () => {
    it('should create a new discount', async () => {
      const createDto = {
        code: 'NEWCODE',
        amount: 15,
        expiry: '2025-12-31T23:59:59Z',
        maxUsage: 50,
        isActive: true,
      };
      const mockDiscount = test.factory.discount.createWithNulls({
        code: 'NEWCODE',
        amount: new Decimal(15),
        maxUsage: 50,
        coachId: 'coach-123',
      });
      test.mocks.DiscountsService.create.mockResolvedValue(mockDiscount);

      const coachToken = await test.auth.createToken({ role: Role.COACH, sub: 'coach-123' });
      await test.http.authenticatedPost('/api/discounts', coachToken, {
        body: createDto,
      });

      expect(test.mocks.DiscountsService.create).toHaveBeenCalledWith(createDto, 'coach-123');
    });
  });

  describe('PUT /discounts/:code', () => {
    it('should update an existing discount', async () => {
      const updateDto = {
        amount: 20,
        maxUsage: 200,
      };
      const updatedDiscount = test.factory.discount.createWithNulls({
        code: 'SUMMER2024',
        amount: new Decimal(20),
        maxUsage: 200,
        coachId: 'coach-123',
      });
      test.mocks.DiscountsService.update.mockResolvedValue(updatedDiscount);

      const coachToken = await test.auth.createToken({ role: Role.COACH, sub: 'coach-123' });
      await test.http.authenticatedPut(
        '/api/discounts/SUMMER2024' as '/api/discounts/{code}',
        coachToken,
        { body: updateDto }
      );

      expect(test.mocks.DiscountsService.update).toHaveBeenCalledWith(
        'SUMMER2024',
        updateDto,
        'coach-123'
      );
    });

    it('should update discount with new expiry', async () => {
      const updateDto = {
        expiry: '2026-06-30T23:59:59Z',
      };
      const updatedDiscount = test.factory.discount.createWithNulls({
        code: 'SUMMER2024',
        expiry: new Date('2026-06-30T23:59:59Z'),
        coachId: 'coach-123',
      });
      test.mocks.DiscountsService.update.mockResolvedValue(updatedDiscount);

      const coachToken = await test.auth.createToken({ role: Role.COACH, sub: 'coach-123' });
      await test.http.authenticatedPut(
        '/api/discounts/SUMMER2024' as '/api/discounts/{code}',
        coachToken,
        { body: updateDto }
      );

      expect(test.mocks.DiscountsService.update).toHaveBeenCalledWith(
        'SUMMER2024',
        updateDto,
        'coach-123'
      );
    });
  });

  describe('DELETE /discounts/:code', () => {
    it('should remove a discount', async () => {
      test.mocks.DiscountsService.remove.mockResolvedValue(undefined);

      const coachToken = await test.auth.createToken({ role: Role.COACH, sub: 'coach-123' });
      await test.http.authenticatedDelete(
        '/api/discounts/SUMMER2024' as '/api/discounts/{code}',
        coachToken
      );

      expect(test.mocks.DiscountsService.remove).toHaveBeenCalledWith('SUMMER2024', 'coach-123');
    });

    it('should return 404 when discount not found', async () => {
      test.mocks.DiscountsService.remove.mockRejectedValue(
        new NotFoundException('Discount not found')
      );

      const coachToken = await test.auth.createToken({ role: Role.COACH, sub: 'coach-123' });
      const response = await test.http.authenticatedDelete(
        '/api/discounts/INVALID' as '/api/discounts/{code}',
        coachToken
      );

      expect(response.status).toBe(404);
    });

    it('should return 403 when coach is not owner', async () => {
      test.mocks.DiscountsService.remove.mockRejectedValue(
        new ForbiddenException('Not authorized to delete this discount')
      );

      const coachToken = await test.auth.createToken({ role: Role.COACH, sub: 'other-coach' });
      const response = await test.http.authenticatedDelete(
        '/api/discounts/SUMMER2024' as '/api/discounts/{code}',
        coachToken
      );

      expect(response.status).toBe(403);
    });
  });

  describe('Error Scenarios', () => {
    describe('Unauthorized access (wrong role)', () => {
      it('should return 403 when USER tries to create discount', async () => {
        const createDto = {
          code: 'NEWCODE',
          amount: 15,
          expiry: '2025-12-31T23:59:59Z',
        };

        const userToken = await test.auth.createToken({ role: Role.USER, sub: 'user-123' });
        const response = await test.http.authenticatedPost('/api/discounts', userToken, {
          body: createDto,
        });

        expect(response.status).toBe(403);
        expect(test.mocks.DiscountsService.create).not.toHaveBeenCalled();
      });

      it('should return 403 when USER tries to get coach discounts', async () => {
        const userToken = await test.auth.createToken({ role: Role.USER, sub: 'user-123' });
        const response = await test.http.moduleAuthenticatedGet('/api/discounts/coach', userToken);

        expect(response.status).toBe(403);
        expect(test.mocks.DiscountsService.findByCoach).not.toHaveBeenCalled();
      });

      it('should return 403 when USER tries to update discount', async () => {
        const updateDto = { amount: 20 };

        const userToken = await test.auth.createToken({ role: Role.USER, sub: 'user-123' });
        const response = await test.http.authenticatedPut(
          '/api/discounts/SUMMER2024' as '/api/discounts/{code}',
          userToken,
          { body: updateDto }
        );

        expect(response.status).toBe(403);
        expect(test.mocks.DiscountsService.update).not.toHaveBeenCalled();
      });

      it('should return 403 when USER tries to delete discount', async () => {
        const userToken = await test.auth.createToken({ role: Role.USER, sub: 'user-123' });
        const response = await test.http.authenticatedDelete(
          '/api/discounts/SUMMER2024' as '/api/discounts/{code}',
          userToken
        );

        expect(response.status).toBe(403);
        expect(test.mocks.DiscountsService.remove).not.toHaveBeenCalled();
      });
    });

    describe('Not found errors', () => {
      it('should return 404 when updating non-existent discount', async () => {
        test.mocks.DiscountsService.update.mockRejectedValue(
          new NotFoundException('Discount not found')
        );

        const coachToken = await test.auth.createToken({ role: Role.COACH, sub: 'coach-123' });
        const response = await test.http.authenticatedPut(
          '/api/discounts/INVALID' as '/api/discounts/{code}',
          coachToken,
          { body: { amount: 20 } }
        );

        expect(response.status).toBe(404);
      });
    });

    describe('Validation errors', () => {
      it('should return 400 when validating invalid discount code', async () => {
        test.mocks.DiscountsService.validateCode.mockRejectedValue(
          new BadRequestException('Invalid or expired discount code')
        );

        const userToken = await test.auth.createToken({ role: Role.USER });
        const response = await test.http.authenticatedPost('/api/discounts/validate', userToken, {
          body: { code: 'INVALID' },
        });

        expect(response.status).toBe(400);
      });

      it('should return 400 when discount code already exists', async () => {
        test.mocks.DiscountsService.create.mockRejectedValue(
          new BadRequestException('Discount code already exists')
        );

        const coachToken = await test.auth.createToken({ role: Role.COACH, sub: 'coach-123' });
        const response = await test.http.authenticatedPost('/api/discounts', coachToken, {
          body: {
            code: 'EXISTING',
            amount: 15,
            expiry: '2025-12-31T23:59:59Z',
          },
        });

        expect(response.status).toBe(400);
      });

      it('should return 400 when discount usage limit reached', async () => {
        test.mocks.DiscountsService.validateCode.mockRejectedValue(
          new BadRequestException('Discount code usage limit reached')
        );

        const userToken = await test.auth.createToken({ role: Role.USER });
        const response = await test.http.authenticatedPost('/api/discounts/validate', userToken, {
          body: { code: 'MAXED_OUT' },
        });

        expect(response.status).toBe(400);
      });
    });
  });
});
