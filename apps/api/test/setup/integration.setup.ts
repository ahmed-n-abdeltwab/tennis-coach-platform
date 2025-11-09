/**
 * Integration test setup
 * This file runs before each integration test file
 */

import { Test } from '@nestjs/testing';
import { PrismaService } from './../../src/app/prisma/prisma.service';

export class NestIntegrationTestContext {
  public prismaService: PrismaService;

  async setup() {
    // Create a test module for Prisma service
    const moduleRef = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    this.prismaService = moduleRef.get<PrismaService>(PrismaService);

    // Ensure database connection
    await this.prismaService.$connect();
  }

  async cleanDatabase() {
    if (this.prismaService) {
      await this.prismaService.session.deleteMany();
      await this.prismaService.timeSlot.deleteMany();
      await this.prismaService.bookingType.deleteMany();
      await this.prismaService.account.deleteMany();
      await this.prismaService.discount.deleteMany();
      await this.prismaService.message.deleteMany();
    }
  }

  async teardown() {
    // Clean up and disconnect
    if (this.prismaService) {
      await this.prismaService.$disconnect();
    }
  }
}

// Make Prisma service available globally for integration tests
global.NestIntegrationTestContext = NestIntegrationTestContext;

// Suppress console output in integration tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn,
  error: console.error,
};
