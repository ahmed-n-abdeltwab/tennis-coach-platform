/**
 * Integration Test Implementation
 * Clean composition of mixins for integration testing
 * Replaces the monolithic BaseIntegrationTest
 */

import { DynamicModule, Provider, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { PrismaService } from '../../../../src/app/prisma/prisma.service';
import { performanceMonitor } from '../../performance/test-performance-monitor';
import type { Endpoints } from '../../types/type-utils';
import { BaseTest } from '../core/base-test';
import { AssertionsMixin } from '../mixins/assertions.mixin';
import { AuthMixin } from '../mixins/auth.mixin';
import { DatabaseCapable, DatabaseMixin } from '../mixins/database.mixin';
import { HttpCapable, HttpMethodsMixin } from '../mixins/http-methods.mixin';

export interface IntegrationTestConfig<TModuleName extends string = string> {
  /** Modules to import for testing - can include async DynamicModules */
  modules: Array<Type<any> | DynamicModule | Promise<DynamicModule>>;
  /** Controllers to include (optional) */
  controllers?: Type<any>[];
  /** Additional providers (optional) */
  providers?: Provider[];
  /** Module name for type-safe routing (e.g., 'booking-types', 'accounts') - optional */
  moduleName?: TModuleName;
}

/**
 * Integration Test Class
 * Provides full integration testing capabilities through composition
 */
export class IntegrationTest<
  TModuleName extends string = string,
  E extends Record<string, any> = Endpoints,
>
  extends BaseTest
  implements HttpCapable, DatabaseCapable
{
  private config: IntegrationTestConfig<TModuleName>;
  private _prisma!: PrismaService;

  // Compose mixins for clean separation of concerns
  readonly http: HttpMethodsMixin<TModuleName, E>;
  readonly auth: AuthMixin;
  readonly db: DatabaseMixin;
  readonly assert: AssertionsMixin;

  constructor(config: IntegrationTestConfig<TModuleName>) {
    super();
    this.config = config;

    // Initialize mixins
    this.http = new HttpMethodsMixin<TModuleName, E>(this);
    this.auth = new AuthMixin();
    this.db = new DatabaseMixin(this);
    this.assert = new AssertionsMixin();
  }

  /**
   * Public accessor for PrismaService
   */
  get database(): PrismaService {
    if (!this._prisma) {
      throw new Error('Database not initialized. Call setup() first.');
    }
    return this._prisma;
  }

  /**
   * Implement HttpCapable interface
   */
  async createAuthHeaders(token?: string) {
    return this.auth.createAuthHeaders(token);
  }

  /**
   * Setup method - builds module and initializes app
   */
  async setup(): Promise<void> {
    await performanceMonitor.trackSetup(async () => {
      // Resolve any Promise<DynamicModule> in the modules array
      const resolvedModules = await Promise.all(
        this.config.modules.map(async module => {
          return module instanceof Promise ? await module : module;
        })
      );

      this._module = await Test.createTestingModule({
        imports: resolvedModules,
        controllers: this.config.controllers ?? [],
        providers: this.config.providers ?? [],
      }).compile();

      this._app = this._module.createNestApplication();
      this._app.setGlobalPrefix('api');
      await this._app.init();

      // Get PrismaService if available
      try {
        this._prisma = this._module.get<PrismaService>(PrismaService, { strict: false });
      } catch {
        // PrismaService not available
      }

      // Setup database if available
      if (this._prisma) {
        await this.db.setupDatabase();
      }
    });
  }

  /**
   * Cleanup method - closes app and cleans database
   */
  async cleanup(): Promise<void> {
    await performanceMonitor.trackCleanup(async () => {
      if (this._prisma) {
        await this.db.cleanupDatabase();
      }

      if (this._app) {
        await this._app.close();
      }
      if (this._module) {
        await this._module.close();
      }
    });
  }
}
