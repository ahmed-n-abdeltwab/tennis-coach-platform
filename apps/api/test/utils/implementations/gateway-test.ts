/**
 * Gateway Test Implementation
 * Clean composition of mixins for WebSocket gateway testing
 * Follows the pattern from tasks.md for consistent, simple testing
 *
 * @example
 * ```typescript
 * describe('MessagesGateway', () => {
 *   let gateway: MessagesGateway;
 *   let service: jest.Mocked<MessagesService>;
 *
 *   beforeEach(async () => {
 *     const result = await createGatewayTest({
 *       gatewayClass: MessagesGateway,
 *       serviceClass: MessagesService,
 *       mockService: {
 *         create: jest.fn(),
 *         findAll: jest.fn(),
 *       },
 *     });
 *     gateway = result.gateway;
 *     service = result.service;
 *   });
 *
 *   afterEach(() => {
 *     jest.clearAllMocks();
 *   });
 * });
 * ```
 */

import { Provider, Type } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';

import { BaseTest } from '../core/base-test';
import { AssertionsMixin } from '../mixins/assertions.mixin';
import { MockMixin } from '../mixins/mock.mixin';

/**
 * Configuration for the createGatewayTest function
 */
export interface CreateGatewayTestConfig<TGateway, TService> {
  /** The gateway class to test */
  gatewayClass: Type<TGateway>;
  /** The service class */
  serviceClass: Type<TService>;
  /** Mock service object with jest.fn() methods */
  mockService: Partial<Record<keyof TService, jest.Mock>>;
  /** Additional mock providers for other dependencies */
  mocks?: Provider[];
  /** Additional providers */
  providers?: Provider[];
}

/**
 * Result from createGatewayTest function
 */
export interface GatewayTestResult<TGateway, TService> {
  /** The gateway instance being tested */
  gateway: TGateway;
  /** The mocked service */
  service: jest.Mocked<TService>;
  /** The testing module (for advanced use cases) */
  module: TestingModule;
  /** Mock socket client helper */
  mockSocket: MockSocketClient;
  /** Mock server helper */
  mockServer: jest.Mocked<Server>;
  /** The GatewayTest instance (for access to mixins) */
  test: GatewayTest<TGateway, TService>;
}

/**
 * Mock Socket Client for testing WebSocket events
 */
export interface MockSocketClient {
  /** The mock socket instance */
  socket: jest.Mocked<Socket>;
  /** Simulate joining a room */
  join: jest.Mock;
  /** Simulate leaving a room */
  leave: jest.Mock;
  /** Simulate emitting an event */
  emit: jest.Mock;
  /** The socket id */
  id: string;
}

/**
 * Creates a mock Socket.io client for testing
 */
export function createMockSocket(id = 'test-socket-id'): MockSocketClient {
  const join = jest.fn();
  const leave = jest.fn();
  const emit = jest.fn();

  const socket = {
    id,
    join,
    leave,
    emit,
    handshake: {
      headers: {},
      query: {},
      auth: {},
    },
    rooms: new Set<string>(),
    data: {},
    disconnect: jest.fn(),
    to: jest.fn().mockReturnThis(),
    broadcast: {
      emit: jest.fn(),
    },
  } as unknown as jest.Mocked<Socket>;

  return { socket, join, leave, emit, id };
}

/**
 * Creates a mock Socket.io Server for testing
 */
export function createMockServer(): jest.Mocked<Server> {
  const toMock = jest.fn();
  const emitMock = jest.fn();

  const mockServer = {
    emit: emitMock,
    to: toMock.mockReturnValue({ emit: emitMock }),
    in: toMock.mockReturnValue({ emit: emitMock }),
    sockets: {
      sockets: new Map(),
    },
  } as unknown as jest.Mocked<Server>;

  return mockServer;
}

/**
 * Gateway Test Configuration
 */
export interface GatewayTestConfig<TGateway, TService> {
  /** The gateway class to test */
  gatewayClass: Type<TGateway>;
  /** The service class for accessing mocked service */
  serviceClass: Type<TService>;
  /** Mock providers for dependencies */
  mocks?: Provider[];
  /** Additional providers */
  providers?: Provider[];
}

/**
 * Gateway Test Class
 * Provides gateway testing capabilities through composition
 */
export class GatewayTest<TGateway, TService = unknown> extends BaseTest {
  private config: GatewayTestConfig<TGateway, TService>;
  private _gateway!: TGateway;
  private _service!: TService;
  private _mockServer!: jest.Mocked<Server>;

  // Compose mixins for clean separation of concerns
  readonly mock: MockMixin;
  readonly assert: AssertionsMixin;

  constructor(config: GatewayTestConfig<TGateway, TService>) {
    super();
    this.config = config;

    // Initialize mixins
    this.mock = new MockMixin();
    this.assert = new AssertionsMixin();
  }

  /**
   * Public accessor for the gateway being tested
   */
  get gateway(): TGateway {
    if (!this._gateway) {
      throw new Error('Gateway not initialized. Call setup() first.');
    }
    return this._gateway;
  }

  /**
   * Public accessor for the mocked service
   */
  get service(): jest.Mocked<TService> {
    if (!this._service) {
      throw new Error('Service not initialized. Call setup() first.');
    }
    return this._service as jest.Mocked<TService>;
  }

  /**
   * Public accessor for the mock server
   */
  get server(): jest.Mocked<Server> {
    if (!this._mockServer) {
      throw new Error('Server not initialized. Call setup() first.');
    }
    return this._mockServer;
  }

  /**
   * Public accessor for the testing module
   */
  get module(): TestingModule {
    if (!this._module) {
      throw new Error('Module not initialized. Call setup() first.');
    }
    return this._module;
  }

  /**
   * Creates a mock socket client for testing
   */
  createMockClient(id?: string): MockSocketClient {
    return createMockSocket(id);
  }

  /**
   * Setup method - creates testing module and initializes gateway
   */
  async setup(): Promise<void> {
    this._module = await Test.createTestingModule({
      providers: [
        this.config.gatewayClass,
        ...(this.config.providers ?? []),
        ...(this.config.mocks ?? []),
      ],
    }).compile();

    this._gateway = this._module.get<TGateway>(this.config.gatewayClass);

    // Get service if serviceClass was provided
    if (this.config.serviceClass) {
      try {
        this._service = this._module.get<TService>(this.config.serviceClass, {
          strict: false,
        });
      } catch {
        // Service not available, that's okay
      }
    }

    // Create and inject mock server
    this._mockServer = createMockServer();
    if ('server' in (this._gateway as object)) {
      (this._gateway as Record<string, unknown>)['server'] = this._mockServer;
    }
  }

  /**
   * Cleanup method - closes module and clears all mocks
   */
  async cleanup(): Promise<void> {
    jest.clearAllMocks();
    if (this._module) {
      await this._module.close();
    }
  }
}

/**
 * Creates a gateway test setup using GatewayTest internally.
 * This is the recommended approach for gateway tests.
 *
 * @example
 * ```typescript
 * describe('MessagesGateway', () => {
 *   let gateway: MessagesGateway;
 *   let service: jest.Mocked<MessagesService>;
 *   let mockSocket: MockSocketClient;
 *
 *   beforeEach(async () => {
 *     const result = await createGatewayTest({
 *       gatewayClass: MessagesGateway,
 *       serviceClass: MessagesService,
 *       mockService: {
 *         create: jest.fn(),
 *         findAll: jest.fn(),
 *       },
 *     });
 *     gateway = result.gateway;
 *     service = result.service;
 *     mockSocket = result.mockSocket;
 *   });
 *
 *   afterEach(() => {
 *     jest.clearAllMocks();
 *   });
 *
 *   it('should handle message event', async () => {
 *     service.create.mockResolvedValue(mockMessage);
 *     await gateway.handleMessage(mockSocket.socket, messageData);
 *     expect(service.create).toHaveBeenCalled();
 *   });
 * });
 * ```
 */
export async function createGatewayTest<TGateway, TService>(
  config: CreateGatewayTestConfig<TGateway, TService>
): Promise<GatewayTestResult<TGateway, TService>> {
  // Build the service provider
  const serviceProvider: Provider = {
    provide: config.serviceClass,
    useValue: config.mockService,
  };

  // Create GatewayTest instance with the configuration
  const gatewayTest = new GatewayTest<TGateway, TService>({
    gatewayClass: config.gatewayClass,
    serviceClass: config.serviceClass,
    mocks: [serviceProvider, ...(config.mocks ?? [])],
    providers: config.providers,
  });

  // Setup the test
  await gatewayTest.setup();

  // Create mock socket for convenience
  const mockSocket = createMockSocket();

  return {
    gateway: gatewayTest.gateway,
    service: gatewayTest.service,
    module: gatewayTest.module,
    mockSocket,
    mockServer: gatewayTest.server,
    test: gatewayTest,
  };
}
