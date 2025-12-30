/**
 * Gateway Test Implementation
 *
 * Providers are auto deep-mocked unless a custom useValue is provided.
 * Define a TMocks interface for full IntelliSense on `test.mocks.ClassName`.
 *
 * @module test-utils/implementations/gateway-test
 *
 * @example
 * ```typescript
 * interface Mocks {
 *   MessagesService: DeepMocked<MessagesService>;
 * }
 *
 * describe('MessagesGateway', () => {
 *   let test = new GatewayTest<MessagesGateway, Mocks>({
 *     gateway: MessagesGateway,
 *     providers: [MessagesService],
 *   });
 *
 *   beforeEach(async () => {
 *     await test.setup();
 *   });
 *
 *   afterEach(async () => {
 *     await test.cleanup();
 *   });
 *
 *   it('should handle message', async () => {
 *     test.mocks.MessagesService.create.mockResolvedValue(mockMessage);
 *     const client = test.createMockClient();
 *     await test.gateway.handleMessage(client.socket, data);
 *   });
 * });
 * ```
 */

import { Provider, Type } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';

import { BaseTest } from '../core/base-test';
import { AssertionsMixin } from '../mixins/assertions.mixin';
import { FactoryMixin } from '../mixins/factory.mixin';
import { buildProviders, MockProvider } from '../mixins/mock.mixin';

// ============================================================================
// Types
// ============================================================================

export interface GatewayTestConfig<TGateway> {
  /** The gateway class to test. */
  gateway: Type<TGateway>;

  /**
   * Providers for the gateway dependencies.
   * - Class types are automatically deep-mocked
   * - Objects with { provide, useValue } use the custom mock
   */
  providers?: readonly MockProvider[];
}

/** Mock Socket Client for testing WebSocket events */
export interface MockSocketClient {
  socket: jest.Mocked<Socket>;
  join: jest.Mock;
  leave: jest.Mock;
  emit: jest.Mock;
  id: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/** Creates a mock Socket.io client for testing */
export function createMockSocket(id = 'test-socket-id'): MockSocketClient {
  const join = jest.fn();
  const leave = jest.fn();
  const emit = jest.fn();

  const socket = {
    id,
    join,
    leave,
    emit,
    handshake: { headers: {}, query: {}, auth: {} },
    rooms: new Set<string>(),
    data: {},
    disconnect: jest.fn(),
    to: jest.fn().mockReturnThis(),
    broadcast: { emit: jest.fn() },
  } as unknown as jest.Mocked<Socket>;

  return { socket, join, leave, emit, id };
}

/** Creates a mock Socket.io Server for testing */
export function createMockServer(): jest.Mocked<Server> {
  const toMock = jest.fn();
  const emitMock = jest.fn();

  return {
    emit: emitMock,
    to: toMock.mockReturnValue({ emit: emitMock }),
    in: toMock.mockReturnValue({ emit: emitMock }),
    sockets: { sockets: new Map() },
  } as unknown as jest.Mocked<Server>;
}

// ============================================================================
// GatewayTest Class
// ============================================================================

/**
 * Gateway Test Class
 *
 * @template TGateway The gateway class being tested
 * @template TMocks Interface defining the mocks shape for IntelliSense
 */
export class GatewayTest<TGateway, TMocks = Record<string, unknown>> extends BaseTest {
  private config: GatewayTestConfig<TGateway>;
  private _gateway!: TGateway;
  private _mocks!: TMocks;
  private _mockServer!: jest.Mocked<Server>;

  /** Assertion helpers for validating test results. */
  readonly assert: AssertionsMixin;

  /** Factory for creating in-memory mock data objects. */
  readonly factory: FactoryMixin;

  constructor(config: GatewayTestConfig<TGateway>) {
    super();
    this.config = config;
    this.assert = new AssertionsMixin();
    this.factory = new FactoryMixin();
  }

  /** The gateway instance being tested. */
  get gateway(): TGateway {
    if (!this._gateway) {
      throw new Error('Gateway not initialized. Call setup() first.');
    }
    return this._gateway;
  }

  /** Type-safe mocks accessible by class name. Define TMocks interface for IntelliSense. */
  get mocks(): TMocks {
    if (!this._mocks) {
      throw new Error('Mocks not initialized. Call setup() first.');
    }
    return this._mocks;
  }

  /** The mock WebSocket server. */
  get server(): jest.Mocked<Server> {
    if (!this._mockServer) {
      throw new Error('Server not initialized. Call setup() first.');
    }
    return this._mockServer;
  }

  /** The NestJS testing module. */
  get module(): TestingModule {
    if (!this._module) {
      throw new Error('Module not initialized. Call setup() first.');
    }
    return this._module;
  }

  /** Creates a mock socket client for testing. */
  createMockClient(id?: string): MockSocketClient {
    return createMockSocket(id);
  }

  /** Setup - creates testing module and initializes gateway. */
  async setup(): Promise<void> {
    const moduleProviders: Provider[] = [this.config.gateway];

    if (this.config.providers && this.config.providers.length > 0) {
      const { providers, mocks } = buildProviders(this.config.providers);
      moduleProviders.push(...providers);
      this._mocks = mocks as TMocks;
    } else {
      this._mocks = {} as TMocks;
    }

    this._module = await Test.createTestingModule({
      providers: moduleProviders,
    }).compile();

    this._gateway = this._module.get<TGateway>(this.config.gateway);

    // Create and inject mock server
    this._mockServer = createMockServer();
    if ('server' in (this._gateway as object)) {
      (this._gateway as Record<string, unknown>)['server'] = this._mockServer;
    }
  }

  /** Cleanup - closes module and clears all mocks. */
  async cleanup(): Promise<void> {
    jest.clearAllMocks();
    if (this._module) {
      await this._module.close();
    }
  }
}
