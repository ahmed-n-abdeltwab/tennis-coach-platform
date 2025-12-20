import { createServiceTest } from '@test-utils';

import { BcryptService } from './bcrypt.service';

describe('BcryptService', () => {
  let service: BcryptService;

  beforeEach(async () => {
    const result = await createServiceTest({
      serviceClass: BcryptService,
    });

    service = result.service;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('hash', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123';
      const hashedPassword = await service.hash(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'testPassword123';
      const hash1 = await service.hash(password);
      const hash2 = await service.hash(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('compare', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'testPassword123';
      const hashedPassword = await service.hash(password);

      const result = await service.compare(password, hashedPassword);

      expect(result).toBe(true);
    });

    it('should return false for non-matching password and hash', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword456';
      const hashedPassword = await service.hash(password);

      const result = await service.compare(wrongPassword, hashedPassword);

      expect(result).toBe(false);
    });
  });
});
