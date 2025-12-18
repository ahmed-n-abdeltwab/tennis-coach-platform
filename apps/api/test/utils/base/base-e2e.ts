/**
 * Configuration-based E2E test class
 * Provides full application setup with all modules for end-to-end testing
 *
 * Usage:
 * ```typescript
 * const test = new BaseE2ETest({
 *   appModule: AppModule,
 * });
 *
 * await test.setup();
 *
 * // Full application available for E2E testing
 * await test.authenticatedPost('/api/sessions', token, { body: data });
 * ```
 */

import { ValidationPipe } from '@nestjs/common';

import { AppModule } from '../../../src/app/app.module';

import { BaseIntegrationTest } from './base-integration';

export interface E2ETestConfig {
  /** The main application module (defaults to AppModule) */
  appModule?: typeof AppModule;
}

export class BaseE2ETest extends BaseIntegrationTest<string> {
  private e2eConfig: E2ETestConfig;

  constructor(config: E2ETestConfig = {}) {
    // Convert E2E config to Integration config
    super({
      modules: [config.appModule ?? AppModule],
      controllers: [],
      providers: [],
    });
    this.e2eConfig = config;
  }

  /**
   * Override setup to use AppModule with validation pipes
   */
  override async setup(): Promise<void> {
    // Call parent setup which handles async module resolution
    await super.setup();

    // Apply global pipes like in main.ts (after app is initialized)
    this.application.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );
  }
}
