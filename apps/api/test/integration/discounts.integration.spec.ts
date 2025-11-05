import { BadRequestException, ForbiddenException, INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { TestDatabaseManager } from '@test/utils/database/test-database-manager';
import { coachFactory, discountFactory } from '@test/utils/factories';
import { PrismaModule, PrismaService } from '../prisma/prisma.service';

import { DiscountsModule } from '../../src/app/discounts/discounts.module';
import { DiscountsService } from '../../src/app/discounts/discounts.service';
import { CreateDiscountDto, UpdateDiscountDto } from '../../src/app/discounts/dto/discount.dto';

describe('Discounts Integration', () => {
  let app: INestApplication;
  let discountsService: DiscountsService;
  let prisma: PrismaService;
  let dbManager: TestDatabaseManager;

  beforeAll(async () => {
    dbManager = TestDatabaseManager.getInstance();
    await dbManager.createTestDatabase('discounts-integration');

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        PrismaModule,
        DiscountsModule,
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    discountsService = module.get<DiscountsService>(DiscountsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
    await dbManager.cleanupTestDatabase('discounts-integration');
  });

  beforeEach(async () => {
    await dbManager.cleanupAllTestDatabases();
  });

  describe('Discount Validation Workflow', () => {
    it('should validate active discount codes successfully', async () => {
      // Arrange
      const coach = await prisma.account.create({
        data: coachFactory.create(),
      });

      const discount = await prisma.discount.create({
        data: discountFactory.createActive({
          coachId: coach.id,
          code: 'ACTIVE20',
          amount: 20,
          useCount: 0,
          maxUsage: 10,
          expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        }),
      });

      // Act
      const result = await discountsService.validateCode('ACTIVE20');

      // Assert
      expect(result).toEqual({
        code: 'ACTIVE20',
        amount: 20,
        isValid: true,
      });
    });

    it('should reject expired discount codes', async () => {
      // Arrange
      const coach = await prisma.account.create({
        data: coachFactory.create(),
      });

      await prisma.discount.create({
        data: discountFactory.createExpired({
          coachId: coach.id,
          code: 'EXPIRED20',
          expiry: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        }),
      });

      // Act & Assert
      await expect(discountsService.validateCode('EXPIRED20')).rejects.toThrow(
        new BadRequestException('Invalid or expired discount code')
      );
    });

    it('should reject inactive discount codes', async () => {
      // Arrange
      const coach = await prisma.account.create({
        data: coachFactory.create(),
      });

      await prisma.discount.create({
        data: discountFactory.createInactive({
          coachId: coach.id,
          code: 'INACTIVE20',
        }),
      });

      // Act & Assert
      await expect(discountsService.validateCode('INACTIVE20')).rejects.toThrow(
        new BadRequestException('Invalid or expired discount code')
      );
    });

    it('should reject discount codes that have reached usage limit', async () => {
      // Arrange
      const coach = await prisma.account.create({
        data: coachFactory.create(),
      });

      await prisma.discount.create({
        data: discountFactory.createFullyUsed({
          coachId: coach.id,
          code: 'MAXED20',
          maxUsage: 5,
          useCount: 5,
        }),
      });

      // Act & Assert
      await expect(discountsService.validateCode('MAXED20')).rejects.toThrow(
        new BadRequestException('Discount code usage limit reached')
      );
    });

    it('should reject non-existent discount codes', async () => {
      // Act & Assert
      await expect(discountsService.validateCode('NONEXISTENT')).rejects.toThrow(
        new BadRequestException('Invalid or expired discount code')
      );
    });
  });

  describe('Discount Management Workflow', () => {
    it('should create discount successfully', async () => {
      // Arrange
      const coach = await prisma.account.create({
        data: coachFactory.create(),
      });

      const createDto: CreateDiscountDto = {
        code: 'NEWCODE20',
        amount: 20,
        expiry: '2024-12-31T23:59:59.000Z',
        maxUsage: 100,
        isActive: true,
      };

      // Act
      const result = await discountsService.create(createDto, coach.id);

      // Assert
      expect(result).toMatchObject({
        code: 'NEWCODE20',
        amount: 20,
        coachId: coach.id,
        maxUsage: 100,
        isActive: true,
        useCount: 0,
      });
      expect(result.expiry).toEqual(new Date('2024-12-31T23:59:59.000Z'));

      // Verify in database
      const dbDiscount = await prisma.discount.findUnique({
        where: { code: 'NEWCODE20' },
      });
      expect(dbDiscount).toBeTruthy();
      expect(dbDiscount?.coachId).toBe(coach.id);
    });

    it('should prevent duplicate discount codes', async () => {
      // Arrange
      const coach = await prisma.account.create({
        data: coachFactory.create(),
      });

      await prisma.discount.create({
        data: discountFactory.createWithCoach(coach.id, { code: 'DUPLICATE20' }),
      });

      const createDto: CreateDiscountDto = {
        code: 'DUPLICATE20',
        amount: 25,
        expiry: '2024-12-31T23:59:59.000Z',
      };

      // Act & Assert
      await expect(discountsService.create(createDto, coach.id)).rejects.toThrow(
        new BadRequestException('Discount code already exists')
      );
    });

    it('should update discount successfully', async () => {
      // Arrange
      const coach = await prisma.account.create({
        data: coachFactory.create(),
      });

      const discount = await prisma.discount.create({
        data: discountFactory.createWithCoach(coach.id, {
          code: 'UPDATE20',
          amount: 20,
          maxUsage: 50,
        }),
      });

      const updateDto: UpdateDiscountDto = {
        amount: 25,
        maxUsage: 75,
        isActive: false,
      };

      // Act
      const result = await discountsService.update('UPDATE20', updateDto, coach.id);

      // Assert
      expect(result.amount).toBe(25);
      expect(result.maxUsage).toBe(75);
      expect(result.isActive).toBe(false);

      // Verify in database
      const dbDiscount = await prisma.discount.findUnique({
        where: { code: 'UPDATE20' },
      });
      expect(dbDiscount?.amount).toBe(25);
      expect(dbDiscount?.maxUsage).toBe(75);
      expect(dbDiscount?.isActive).toBe(false);
    });

    it('should prevent unauthorized discount updates', async () => {
      // Arrange
      const coach1 = await prisma.account.create({
        data: coachFactory.create(),
      });

      const coach2 = await prisma.account.create({
        data: coachFactory.create(),
      });

      await prisma.discount.create({
        data: discountFactory.createWithCoach(coach1.id, { code: 'NOTMINE20' }),
      });

      const updateDto: UpdateDiscountDto = { amount: 25 };

      // Act & Assert
      await expect(discountsService.update('NOTMINE20', updateDto, coach2.id)).rejects.toThrow(
        new ForbiddenException('Not authorized to update this discount')
      );
    });

    it('should soft delete discount successfully', async () => {
      // Arrange
      const coach = await prisma.account.create({
        data: coachFactory.create(),
      });

      const discount = await prisma.discount.create({
        data: discountFactory.createWithCoach(coach.id, {
          code: 'DELETE20',
          isActive: true,
        }),
      });

      // Act
      const result = await discountsService.remove('DELETE20', coach.id);

      // Assert
      expect(result.isActive).toBe(false);

      // Verify in database
      const dbDiscount = await prisma.discount.findUnique({
        where: { code: 'DELETE20' },
      });
      expect(dbDiscount?.isActive).toBe(false);
    });

    it('should prevent unauthorized discount deletion', async () => {
      // Arrange
      const coach1 = await prisma.account.create({
        data: coachFactory.create(),
      });

      const coach2 = await prisma.account.create({
        data: coachFactory.create(),
      });

      await prisma.discount.create({
        data: discountFactory.createWithCoach(coach1.id, { code: 'NOTMINE20' }),
      });

      // Act & Assert
      await expect(discountsService.remove('NOTMINE20', coach2.id)).rejects.toThrow(
        new ForbiddenException('Not authorized to delete this discount')
      );
    });
  });

  describe('Coach Discount Retrieval', () => {
    it('should retrieve all discounts for a coach', async () => {
      // Arrange
      const coach = await prisma.account.create({
        data: coachFactory.create(),
      });

      const otherCoach = await prisma.account.create({
        data: coachFactory.create(),
      });

      // Create discounts for the coach
      const discount1 = await prisma.discount.create({
        data: discountFactory.createWithCoach(coach.id, { code: 'COACH1' }),
      });

      const discount2 = await prisma.discount.create({
        data: discountFactory.createWithCoach(coach.id, { code: 'COACH2' }),
      });

      // Create discount for other coach (should not be returned)
      await prisma.discount.create({
        data: discountFactory.createWithCoach(otherCoach.id, { code: 'OTHER' }),
      });

      // Act
      const result = await discountsService.findByCoach(coach.id);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.map(d => d.code)).toContain('COACH1');
      expect(result.map(d => d.code)).toContain('COACH2');
      expect(result.map(d => d.code)).not.toContain('OTHER');
      expect(result.every(d => d.coachId === coach.id)).toBe(true);
    });

    it('should return empty array when coach has no discounts', async () => {
      // Arrange
      const coach = await prisma.account.create({
        data: coachFactory.create(),
      });

      // Act
      const result = await discountsService.findByCoach(coach.id);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return discounts ordered by creation date (newest first)', async () => {
      // Arrange
      const coach = await prisma.account.create({
        data: coachFactory.create(),
      });

      // Create discounts with different timestamps
      const discount1 = await prisma.discount.create({
        data: discountFactory.createWithCoach(coach.id, {
          code: 'FIRST',
          createdAt: new Date('2024-01-01'),
        }),
      });

      const discount2 = await prisma.discount.create({
        data: discountFactory.createWithCoach(coach.id, {
          code: 'SECOND',
          createdAt: new Date('2024-01-02'),
        }),
      });

      const discount3 = await prisma.discount.create({
        data: discountFactory.createWithCoach(coach.id, {
          code: 'THIRD',
          createdAt: new Date('2024-01-03'),
        }),
      });

      // Act
      const result = await discountsService.findByCoach(coach.id);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].code).toBe('THIRD'); // Newest first
      expect(result[1].code).toBe('SECOND');
      expect(result[2].code).toBe('FIRST'); // Oldest last
    });
  });

  describe('Discount Calculation and Application Logic', () => {
    it('should validate discount amounts correctly', async () => {
      // Arrange
      const coach = await prisma.account.create({
        data: coachFactory.create(),
      });

      const discount = await prisma.discount.create({
        data: discountFactory.createActive({
          coachId: coach.id,
          code: 'CALC20',
          amount: 20.5, // Test decimal amounts
          useCount: 0,
          maxUsage: 10,
        }),
      });

      // Act
      const result = await discountsService.validateCode('CALC20');

      // Assert
      expect(result.amount).toBe(20.5);
      expect(typeof result.amount).toBe('number');
    });

    it('should handle edge cases in usage counting', async () => {
      // Arrange
      const coach = await prisma.account.create({
        data: coachFactory.create(),
      });

      // Test discount at usage limit boundary
      const discount = await prisma.discount.create({
        data: discountFactory.createActive({
          coachId: coach.id,
          code: 'BOUNDARY20',
          useCount: 9,
          maxUsage: 10, // One use remaining
        }),
      });

      // Act - Should still be valid
      const result = await discountsService.validateCode('BOUNDARY20');

      // Assert
      expect(result.isValid).toBe(true);

      // Now test when it reaches the limit
      await prisma.discount.update({
        where: { code: 'BOUNDARY20' },
        data: { useCount: 10 },
      });

      // Act & Assert - Should now be invalid
      await expect(discountsService.validateCode('BOUNDARY20')).rejects.toThrow(
        new BadRequestException('Discount code usage limit reached')
      );
    });
  });

  describe('Error Handling in Discount Operations', () => {
    it('should handle database errors gracefully', async () => {
      // This test would typically involve mocking database failures
      // For integration tests, we test the actual error scenarios that can occur

      // Test with invalid coach ID format (if using UUID validation)
      const createDto: CreateDiscountDto = {
        code: 'INVALID20',
        amount: 20,
        expiry: '2024-12-31T23:59:59.000Z',
      };

      // Act & Assert - This should handle the database constraint error
      await expect(discountsService.create(createDto, 'invalid-coach-id')).rejects.toThrow();
    });

    it('should handle concurrent discount code creation', async () => {
      // Arrange
      const coach = await prisma.account.create({
        data: coachFactory.create(),
      });

      const createDto: CreateDiscountDto = {
        code: 'CONCURRENT20',
        amount: 20,
        expiry: '2024-12-31T23:59:59.000Z',
      };

      // Act - Create first discount
      await discountsService.create(createDto, coach.id);

      // Act & Assert - Try to create duplicate (should fail)
      await expect(discountsService.create(createDto, coach.id)).rejects.toThrow(
        new BadRequestException('Discount code already exists')
      );
    });
  });
});
