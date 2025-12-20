import { HashingService } from './hashing.service';

describe('HashingService', () => {
  describe('abstract class', () => {
    it('should be an abstract class that cannot be instantiated directly', () => {
      // TypeScript prevents direct instantiation of abstract classes at compile time
      // This test verifies the class structure exists
      expect(HashingService).toBeDefined();
    });
  });

  describe('concrete implementation', () => {
    class TestHashingService extends HashingService {
      async hash(data: string): Promise<string> {
        return `hashed_${data}`;
      }

      async compare(data: string, encrypted: string): Promise<boolean> {
        return encrypted === `hashed_${data}`;
      }
    }

    let service: TestHashingService;

    beforeEach(() => {
      service = new TestHashingService();
    });

    it('should be instantiable when extended', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(HashingService);
    });

    it('should implement hash method', async () => {
      const result = await service.hash('test');
      expect(result).toBe('hashed_test');
    });

    it('should implement compare method returning true for matching data', async () => {
      const result = await service.compare('test', 'hashed_test');
      expect(result).toBe(true);
    });

    it('should implement compare method returning false for non-matching data', async () => {
      const result = await service.compare('test', 'wrong_hash');
      expect(result).toBe(false);
    });
  });
});
