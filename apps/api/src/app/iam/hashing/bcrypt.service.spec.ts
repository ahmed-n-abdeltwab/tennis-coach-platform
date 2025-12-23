import { BcryptMockState, ServiceTest } from '@test-utils';
import * as bcryptjs from 'bcryptjs';

import { BcryptService } from './bcrypt.service';

jest.mock('bcryptjs');

describe('BcryptService', () => {
  let test: ServiceTest<BcryptService>;
  let bcryptMocks: BcryptMockState;

  beforeEach(async () => {
    // Create service test instance first
    test = new ServiceTest({
      serviceClass: BcryptService,
    });

    // Setup bcrypt mocks using the test's mock mixin
    bcryptMocks = test.mock.createMockBcrypt();
    test.mock.setupBcryptMocks(bcryptjs, bcryptMocks);

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(test.service).toBeDefined();
    });
  });

  describe('hash', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123';
      const hashedPassword = await test.service.hash(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(0);
      expect(bcryptjs.genSalt).toHaveBeenCalled();
      expect(bcryptjs.hash).toHaveBeenCalledWith(password, '$2a$10$mockedsalt');
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'testPassword123';
      const hash1 = await test.service.hash(password);
      const hash2 = await test.service.hash(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('compare', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'testPassword123';
      const hashedPassword = await test.service.hash(password);

      const result = await test.service.compare(password, hashedPassword);

      expect(result).toBe(true);
      expect(bcryptjs.compare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('should return false for non-matching password and hash', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword456';
      const hashedPassword = await test.service.hash(password);

      const result = await test.service.compare(wrongPassword, hashedPassword);

      expect(result).toBe(false);
    });
  });
});
