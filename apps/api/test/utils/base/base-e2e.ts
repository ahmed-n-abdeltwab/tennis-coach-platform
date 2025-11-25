/**
 * Abstract base class for E2E testing
 * Provides full application setup with all modules for end-to-end testing
 */

import { Test } from '@nestjs/testing';

import { AppModule } from '../../../src/app/app.module';
import { PrismaService } from '../../../src/app/prisma/prisma.service';

import { BaseIntegrationTest } from './base-integration';

export abstract class BaseE2ETest extends BaseIntegrationTest {
  /**
   * Setup method for E2E tests
   * Loads the full AppModule for complete end-to-end testing
   */
  async setupTestApp(): Promise<void> {
    // E2E tests use the full AppModule
    // No additional setup needed - app is created in setup()
  }

  /**
   * Gets the full application module for E2E testing
   */
  getTestModules(): [typeof AppModule] {
    return [AppModule];
  }

  /**
   * Override setup to use AppModule
   */
  override async setup(): Promise<void> {
    const { ValidationPipe } = await import('@nestjs/common');

    this.module = await Test.createTestingModule({
      imports: this.getTestModules(),
    }).compile();

    this.app = this.module.createNestApplication();
    this.app.setGlobalPrefix('api');

    // Apply global pipes like in main.ts
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );

    await this.app.init();

    // Get PrismaService
    try {
      this.prisma = this.module.get<PrismaService>(PrismaService, { strict: false });
    } catch {
      // PrismaService not available, skip database setup
    }

    await this.setupDatabase();
  }
}
