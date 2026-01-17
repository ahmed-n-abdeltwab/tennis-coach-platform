import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';

import { APMService } from '../apm/apm.service';

import { APMInterceptor } from './apm.interceptor';

/**
 * APMInterceptor Unit Tests
 *
 * Tests the APM interceptor functionality including:
 * - Request tracking
 * - Error handling
 * - Route extraction
 * - User ID extraction
 */

describe('APMInterceptor', () => {
  let interceptor: APMInterceptor;
  let apmService: jest.Mocked<APMService>;

  beforeEach(async () => {
    const mockApmService = {
      recordAPIRequest: jest.fn(),
      traceOperation: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        APMInterceptor,
        {
          provide: APMService,
          useValue: mockApmService,
        },
      ],
    }).compile();

    interceptor = module.get<APMInterceptor>(APMInterceptor);
    apmService = module.get(APMService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    let mockExecutionContext: jest.Mocked<ExecutionContext>;
    let mockCallHandler: jest.Mocked<CallHandler>;

    beforeEach(() => {
      jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1150); // End time

      const mockRequest = jest.fn();
      const mockResponse = jest.fn();

      mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: mockRequest,
          getResponse: mockResponse,
        }),
      } as unknown as jest.Mocked<ExecutionContext>;

      mockCallHandler = {
        handle: jest.fn(),
      } as jest.Mocked<CallHandler>;
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should track successful requests', done => {
      const mockRequest = {
        method: 'GET',
        url: '/api/test',
        headers: { 'user-agent': 'test-agent' },
        route: { path: '/api/test' },
      };
      const mockResponse = {
        statusCode: 200,
      };

      const httpContext = mockExecutionContext.switchToHttp();
      (httpContext.getRequest as jest.Mock).mockReturnValue(mockRequest);
      (httpContext.getResponse as jest.Mock).mockReturnValue(mockResponse);
      mockCallHandler.handle.mockReturnValue(of('success'));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: result => {
          expect(result).toBe('success');
          expect(apmService.recordAPIRequest).toHaveBeenCalledWith('GET', '/api/test', 200, 150);
          expect(apmService.traceOperation).toHaveBeenCalledWith('http.get', expect.any(Function), {
            'http.method': 'GET',
            'http.route': '/api/test',
            'http.status_code': 200,
            'http.duration_ms': 150,
            'http.user_agent': 'test-agent',
            'user.id': 'anonymous',
          });
          done();
        },
      });
    });

    it('should track failed requests', done => {
      const error = new Error('Test error');
      (error as unknown as { status: number }).status = 400;

      const mockRequest = {
        method: 'POST',
        url: '/api/test',
        headers: { 'user-agent': 'test-agent' },
        route: { path: '/api/test' },
      };
      const mockResponse = {
        statusCode: 400,
      };

      const httpContext = mockExecutionContext.switchToHttp();
      (httpContext.getRequest as jest.Mock).mockReturnValue(mockRequest);
      (httpContext.getResponse as jest.Mock).mockReturnValue(mockResponse);
      mockCallHandler.handle.mockReturnValue(throwError(() => error));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: err => {
          expect(err).toBe(error);
          expect(apmService.recordAPIRequest).toHaveBeenCalledWith('POST', '/api/test', 400, 150);
          expect(apmService.traceOperation).toHaveBeenCalledWith(
            'http.post.error',
            expect.any(Function),
            expect.objectContaining({
              'http.method': 'POST',
              'http.route': '/api/test',
              'http.status_code': 400,
              'http.duration_ms': 150,
              'error.type': 'Error',
              'error.message': 'Test error',
            })
          );
          done();
        },
      });
    });

    it('should extract user ID from authenticated request', done => {
      const mockRequest = {
        method: 'GET',
        url: '/api/test',
        headers: { 'user-agent': 'test-agent' },
        route: { path: '/api/test' },
        user: { sub: 'user123' },
      };
      const mockResponse = {
        statusCode: 200,
      };

      const httpContext = mockExecutionContext.switchToHttp();
      (httpContext.getRequest as jest.Mock).mockReturnValue(mockRequest);
      (httpContext.getResponse as jest.Mock).mockReturnValue(mockResponse);
      mockCallHandler.handle.mockReturnValue(of('success'));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          expect(apmService.traceOperation).toHaveBeenCalledWith(
            'http.get',
            expect.any(Function),
            expect.objectContaining({
              'user.id': 'user123',
            })
          );
          done();
        },
      });
    });
  });

  describe('extractRoute', () => {
    it('should extract route from request.route.path', () => {
      const mockRequest = {
        route: { path: '/api/users/:id' },
        url: '/api/users/123?param=value',
      };

      const route = (interceptor as any).extractRoute(mockRequest);
      expect(route).toBe('/api/users/:id');
    });

    it('should normalize CUID patterns in URL', () => {
      const mockRequest = {
        url: '/api/users/cuser123456789012345678/sessions',
      };

      const route = (interceptor as any).extractRoute(mockRequest);
      expect(route).toBe('/api/users/:id/sessions');
    });

    it('should normalize numeric IDs in URL', () => {
      const mockRequest = {
        url: '/api/users/123/sessions',
      };

      const route = (interceptor as any).extractRoute(mockRequest);
      expect(route).toBe('/api/users/:id/sessions');
    });

    it('should normalize UUID patterns in URL', () => {
      const mockRequest = {
        url: '/api/users/550e8400-e29b-41d4-a716-446655440000/sessions',
      };

      const route = (interceptor as any).extractRoute(mockRequest);
      expect(route).toBe('/api/users/:id/sessions');
    });

    it('should handle URLs with query parameters', () => {
      const mockRequest = {
        url: '/api/users/123?page=1&limit=10',
      };

      const route = (interceptor as any).extractRoute(mockRequest);
      expect(route).toBe('/api/users/:id');
    });

    it('should handle missing URL gracefully', () => {
      const mockRequest = {};

      const route = (interceptor as any).extractRoute(mockRequest);
      expect(route).toBe('/unknown');
    });
  });

  describe('extractUserId', () => {
    it('should extract user ID from user.sub', () => {
      const mockRequest = {
        user: { sub: 'user123' },
      };

      const userId = (interceptor as any).extractUserId(mockRequest);
      expect(userId).toBe('user123');
    });

    it('should extract user ID from user.id if sub is not available', () => {
      const mockRequest = {
        user: { id: 'user456' },
      };

      const userId = (interceptor as any).extractUserId(mockRequest);
      expect(userId).toBe('user456');
    });

    it('should return undefined if no user is present', () => {
      const mockRequest = {};

      const userId = (interceptor as any).extractUserId(mockRequest);
      expect(userId).toBeUndefined();
    });

    it('should prefer sub over id when both are present', () => {
      const mockRequest = {
        user: { sub: 'user123', id: 'user456' },
      };

      const userId = (interceptor as any).extractUserId(mockRequest);
      expect(userId).toBe('user123');
    });
  });
});
