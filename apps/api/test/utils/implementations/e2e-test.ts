/**
 * E2E Test Implementation
 *
 * For full end-to-end testing with the complete application.
 * Extends IntegrationTest with full application setup.
 *
 * @module test-utils/implementations/e2e-test
 */

import { ValidationPipe } from '@nestjs/common';

import { AppModule } from '../../../src/app/app.module';

import { IntegrationTest, IntegrationTestConfig } from './integration-test';

export interface E2ETestConfig<TModuleName extends string = string> {
  /** The main application module (defaults to AppModule) */
  appModule?: typeof AppModule;

  /**
   * Module name for HTTP route filtering (e.g., 'accounts', 'sessions').
   * Used by module* HTTP methods for type-safe route filtering.
   */
  moduleName?: TModuleName;
}

/**
 * E2E Test Class
 *
 * For full end-to-end testing with the complete application.
 *
 * @template TModuleName Module name for HTTP route filtering (optional)
 */
export class E2ETest<TModuleName extends string = string> extends IntegrationTest<TModuleName> {
  constructor(config: E2ETestConfig<TModuleName> = {}) {
    const integrationConfig: IntegrationTestConfig<TModuleName> = {
      modules: [config.appModule ?? AppModule],
      controllers: [],
      providers: [],
      moduleName: config.moduleName,
    };

    super(integrationConfig);
  }

  /** Setup - builds full app with validation pipes. */
  override async setup(): Promise<void> {
    await super.setup();

    // Apply global pipes like in main.ts
    if (this._app) {
      this._app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        })
      );
    }
  }
}
