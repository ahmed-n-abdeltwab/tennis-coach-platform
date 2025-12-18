/**
 * E2E Test Implementation
 * Clean composition of mixins for end-to-end testing
 * Replaces the monolithic BaseE2ETest
 */

import { ValidationPipe } from '@nestjs/common';

import { AppModule } from '../../../../src/app/app.module';

import { IntegrationTest, IntegrationTestConfig } from './integration-test';

export interface E2ETestConfig {
  /** The main application module (defaults to AppModule) */
  appModule?: typeof AppModule;
}

/**
 * E2E Test Class
 * Extends IntegrationTest with full application setup
 */
export class E2ETest extends IntegrationTest<string> {
  constructor(config: E2ETestConfig = {}) {
    // Convert E2E config to Integration config
    const integrationConfig: IntegrationTestConfig = {
      modules: [config.appModule ?? AppModule],
      controllers: [],
      providers: [],
    };

    super(integrationConfig);
  }

  /**
   * Override setup to add validation pipes like in main.ts
   */
  override async setup(): Promise<void> {
    // Call parent setup which handles module building and database setup
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
