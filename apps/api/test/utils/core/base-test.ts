/**
 * Core base test class - Foundation for all test types
 * Provides common setup/cleanup patterns and accessors
 */

import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';

/**
 * Abstract base class for all test types
 * Provides common patterns for setup, cleanup, and resource access
 */
export abstract class BaseTest {
  protected _app?: INestApplication;
  protected _module?: TestingModule;

  /**
   * Public accessor for the NestJS application
   */
  get application(): INestApplication {
    if (!this._app) {
      throw new Error('Application not initialized. Call setup() first.');
    }
    return this._app;
  }

  /**
   * Public accessor for the testing module
   */
  get testModule(): TestingModule {
    if (!this._module) {
      throw new Error('Module not initialized. Call setup() first.');
    }
    return this._module;
  }

  /**
   * Setup method - must be implemented by subclasses
   */
  abstract setup(): Promise<void>;

  /**
   * Cleanup method - must be implemented by subclasses
   */
  abstract cleanup(): Promise<void>;

  /**
   * Check if app is initialized
   */
  protected get isInitialized(): boolean {
    return !!this._app && !!this._module;
  }
}
