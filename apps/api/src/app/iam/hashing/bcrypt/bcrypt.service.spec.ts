import { ServiceTest } from '@test-utils';
import * as bcryptjs from 'bcryptjs';

import { BcryptService } from './bcrypt.service';

jest.mock('bcryptjs');

const mockedBcrypt = bcryptjs as jest.Mocked<typeof bcryptjs>;

describe('BcryptService', () => {
  let test: ServiceTest<BcryptService, Record<string, never>>;

  beforeEach(async () => {
    test = new ServiceTest({
      service: BcryptService,
      providers: [],
    });

    // Setup bcrypt mocks
    mockedBcrypt.genSalt.mockResolvedValue('$2a$10$mockedsalt' as never);
    mockedBcrypt.hash.mockImplementation(
      (data: string) => Promise.resolve(`hashed_${data}`) as never
    );
    mockedBcrypt.compare.mockImplementation(
      (data: string, encrypted: string) => Promise.resolve(encrypted === `hashed_${data}`) as never
    );

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(test.service).toBeDefined();
    });
  });

  describe('hash', () => {
    it('should hash a password using bcrypt', async () => {
      const password = 'testPassword123';

      const hashedPassword = await test.service.hash(password);

      expect(hashedPassword).toBe('hashed_testPassword123');
      expect(mockedBcrypt.genSalt).toHaveBeenCalled();
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, '$2a$10$mockedsalt');
    });

    it('should generate salt before hashing', async () => {
      const password = 'mySecurePassword';

      await test.service.hash(password);

      expect(mockedBcrypt.genSalt).toHaveBeenCalledTimes(1);
      expect(mockedBcrypt.hash).toHaveBeenCalledTimes(1);
    });

    it('should return different hash for different passwords', async () => {
      const password1 = 'password1';
      const password2 = 'password2';

      const hash1 = await test.service.hash(password1);
      const hash2 = await test.service.hash(password2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('compare', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'testPassword123';
      const hashedPassword = 'hashed_testPassword123';

      const result = await test.service.compare(password, hashedPassword);

      expect(result).toBe(true);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('should return false for non-matching password and hash', async () => {
      const password = 'testPassword123';
      const wrongHash = 'hashed_wrongPassword';

      const result = await test.service.compare(password, wrongHash);

      expect(result).toBe(false);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, wrongHash);
    });

    it('should delegate comparison to bcryptjs', async () => {
      const password = 'anyPassword';
      const hash = 'anyHash';

      await test.service.compare(password, hash);

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hash);
    });
  });
});
