/**
 * Integration Test Implementation
 *
 * For full integration testing with real modules and database.
 * Uses real NestJS modules, not mocks.
 *
 * @module test-utils/implementations/integration-test
 */

import { DynamicModule, Provider, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { PrismaService } from '../../../src/app/prisma/prisma.service';
import { performanceMonitor } from '../../infrastructure/performance/test-performance-monitor';
import { BaseTest } from '../core/base-test';
import { AssertionsMixin } from '../mixins/assertions.mixin';
import { AuthMixin } from '../mixins/auth.mixin';
import { DatabaseCapable, DatabaseMixin } from '../mixins/database.mixin';
import { FactoryMixin } from '../mixins/factory.mixin';
import { HttpCapable, HttpMethodsMixin } from '../mixins/http-methods.mixin';

export interface IntegrationTestConfig<TModuleName extends string = string> {
  /** Modules to import for testing - can include async DynamicModules */
  modules: Array<Type<unknown> | DynamicModule | Promise<DynamicModule>>;

  /** Controllers to include (optional) */
  controllers?: Type<unknown>[];

  /** Additional providers (optional) */
  providers?: Provider[];

  /**
   * Module name for HTTP route filtering (e.g., 'accounts', 'sessions').
   * Used by module* HTTP methods for type-safe route filtering.
   */
  moduleName?: TModuleName;
}

/**
 * Integration Test Class
 *
 * For full integration testing with real modules and database.
 *
 * @template TModuleName Module name for HTTP route filtering (optional)
 */
export class IntegrationTest<TModuleName extends string = string>
  extends BaseTest
  implements HttpCapable, DatabaseCapable
{
  private config: IntegrationTestConfig<TModuleName>;
  private _prisma!: PrismaService;

  /** HTTP methods for making requests. */
  readonly http: HttpMethodsMixin<TModuleName>;

  /** Auth helpers for creating tokens and headers. */
  readonly auth: AuthMixin;

  /** Database helpers for setup/cleanup. */
  readonly db: DatabaseMixin;

  /** Assertion helpers for validating test results. */
  readonly assert: AssertionsMixin;

  /** Factory for creating in-memory mock data objects. */
  readonly factory: FactoryMixin;

  constructor(config: IntegrationTestConfig<TModuleName>) {
    super();
    this.config = config;
    this.http = new HttpMethodsMixin<TModuleName>(this);
    this.auth = new AuthMixin();
    this.db = new DatabaseMixin(this);
    this.assert = new AssertionsMixin();
    this.factory = new FactoryMixin();
  }

  /** The PrismaService for database access. */
  get database(): PrismaService {
    if (!this._prisma) {
      throw new Error('Database not initialized. Call setup() first.');
    }
    return this._prisma;
  }

  /** Implement HttpCapable interface */
  async createAuthHeaders(token?: string) {
    return this.auth.createAuthHeaders(token);
  }

  /** Setup - builds module and initializes app. */
  async setup(): Promise<void> {
    await performanceMonitor.trackSetup(async () => {
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

      try {
        this._prisma = this._module.get<PrismaService>(PrismaService, { strict: false });
      } catch {
        // PrismaService not available
      }

      if (this._prisma) {
        await this.db.setupDatabase();
      }
    });
  }

  /** Cleanup - closes app and cleans database. */
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
