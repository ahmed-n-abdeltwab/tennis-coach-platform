import { AppLoggerService } from './app-logger.service';

describe('AppLoggerService', () => {
  let service: AppLoggerService;

  beforeEach(() => {
    service = new AppLoggerService();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should use default context when none provided', () => {
      const defaultService = new AppLoggerService();
      expect(defaultService).toBeDefined();
    });

    it('should use provided context', () => {
      const customService = new AppLoggerService('CustomContext');
      expect(customService).toBeDefined();
    });
  });

  describe('getLogLevels', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      // Create a fresh copy of process.env for each test
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      // Restore original process.env after all tests
      process.env = originalEnv;
    });

    it('should return all levels in development by default', () => {
      delete process.env.LOG_LEVEL;
      process.env.NODE_ENV = 'development';

      const levels = AppLoggerService.getLogLevels();

      expect(levels).toEqual(['error', 'warn', 'log', 'debug', 'verbose']);
    });

    it('should return limited levels in production by default', () => {
      delete process.env.LOG_LEVEL;
      process.env.NODE_ENV = 'production';

      const levels = AppLoggerService.getLogLevels();

      expect(levels).toEqual(['error', 'warn', 'log']);
    });

    it('should respect LOG_LEVEL environment variable for error', () => {
      process.env.LOG_LEVEL = 'error';

      const levels = AppLoggerService.getLogLevels();

      expect(levels).toEqual(['error']);
    });

    it('should respect LOG_LEVEL environment variable for warn', () => {
      process.env.LOG_LEVEL = 'warn';

      const levels = AppLoggerService.getLogLevels();

      expect(levels).toEqual(['error', 'warn']);
    });

    it('should respect LOG_LEVEL environment variable for log', () => {
      process.env.LOG_LEVEL = 'log';

      const levels = AppLoggerService.getLogLevels();

      expect(levels).toEqual(['error', 'warn', 'log']);
    });

    it('should respect LOG_LEVEL environment variable for debug', () => {
      process.env.LOG_LEVEL = 'debug';

      const levels = AppLoggerService.getLogLevels();

      expect(levels).toEqual(['error', 'warn', 'log', 'debug']);
    });

    it('should respect LOG_LEVEL environment variable for verbose', () => {
      process.env.LOG_LEVEL = 'verbose';

      const levels = AppLoggerService.getLogLevels();

      expect(levels).toEqual(['error', 'warn', 'log', 'debug', 'verbose']);
    });

    it('should return default levels for invalid LOG_LEVEL', () => {
      process.env.LOG_LEVEL = 'invalid';

      const levels = AppLoggerService.getLogLevels();

      expect(levels).toEqual(['error', 'warn', 'log']);
    });

    it('should prioritize LOG_LEVEL over NODE_ENV', () => {
      process.env.NODE_ENV = 'production';
      process.env.LOG_LEVEL = 'verbose';

      const levels = AppLoggerService.getLogLevels();

      expect(levels).toEqual(['error', 'warn', 'log', 'debug', 'verbose']);
    });
  });

  describe('log methods', () => {
    let logSpy: jest.SpyInstance;
    let warnSpy: jest.SpyInstance;
    let errorSpy: jest.SpyInstance;
    let debugSpy: jest.SpyInstance;
    let verboseSpy: jest.SpyInstance;

    beforeEach(() => {
      // Spy on the parent Logger class methods
      logSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(service)), 'log');
      warnSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(service)), 'warn');
      errorSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(service)), 'error');
      debugSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(service)), 'debug');
      verboseSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(service)), 'verbose');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('log', () => {
      it('should call parent log method with message', () => {
        service.log('Test message');

        expect(logSpy).toHaveBeenCalledWith('Test message', 'AppLogger');
      });

      it('should call parent log method with custom context', () => {
        service.log('Test message', 'CustomContext');

        expect(logSpy).toHaveBeenCalledWith('Test message', 'CustomContext');
      });
    });

    describe('warn', () => {
      it('should call parent warn method with message', () => {
        service.warn('Warning message');

        expect(warnSpy).toHaveBeenCalledWith('Warning message', 'AppLogger');
      });

      it('should call parent warn method with custom context', () => {
        service.warn('Warning message', 'CustomContext');

        expect(warnSpy).toHaveBeenCalledWith('Warning message', 'CustomContext');
      });
    });

    describe('error', () => {
      it('should call parent error method with message and trace', () => {
        service.error('Error message', 'stack trace');

        expect(errorSpy).toHaveBeenCalledWith('Error message', 'stack trace', 'AppLogger');
      });

      it('should call parent error method with custom context', () => {
        service.error('Error message', 'stack trace', 'CustomContext');

        expect(errorSpy).toHaveBeenCalledWith('Error message', 'stack trace', 'CustomContext');
      });

      it('should handle Error objects and extract message and stack', () => {
        const error = new Error('Test error');

        service.error(error);

        expect(errorSpy).toHaveBeenCalledWith('Test error', error.stack, 'AppLogger');
      });

      it('should handle Error objects with custom context', () => {
        const error = new Error('Test error');

        service.error(error, undefined, 'CustomContext');

        expect(errorSpy).toHaveBeenCalledWith('Test error', error.stack, 'CustomContext');
      });
    });

    describe('debug', () => {
      it('should call parent debug method with message', () => {
        service.debug('Debug message');

        expect(debugSpy).toHaveBeenCalledWith('Debug message', 'AppLogger');
      });

      it('should call parent debug method with custom context', () => {
        service.debug('Debug message', 'CustomContext');

        expect(debugSpy).toHaveBeenCalledWith('Debug message', 'CustomContext');
      });
    });

    describe('verbose', () => {
      it('should call parent verbose method with message', () => {
        service.verbose('Verbose message');

        expect(verboseSpy).toHaveBeenCalledWith('Verbose message', 'AppLogger');
      });

      it('should call parent verbose method with custom context', () => {
        service.verbose('Verbose message', 'CustomContext');

        expect(verboseSpy).toHaveBeenCalledWith('Verbose message', 'CustomContext');
      });
    });
  });

  describe('context handling', () => {
    it('should use service context when no context provided to methods', () => {
      const customService = new AppLoggerService('MyService');
      const logSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(customService)), 'log');

      customService.log('Test message');

      expect(logSpy).toHaveBeenCalledWith('Test message', 'MyService');

      logSpy.mockRestore();
    });

    it('should override service context when context provided to methods', () => {
      const customService = new AppLoggerService('MyService');
      const logSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(customService)), 'log');

      customService.log('Test message', 'OverrideContext');

      expect(logSpy).toHaveBeenCalledWith('Test message', 'OverrideContext');

      logSpy.mockRestore();
    });
  });
});
