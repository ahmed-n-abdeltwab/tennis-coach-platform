import { parseJwtTime } from './jwt-time.util';

describe('parseJwtTime', () => {
  describe('with valid formats', () => {
    it('should parse seconds', () => {
      expect(parseJwtTime('30s', '15m')).toBe(30 * 1000);
    });

    it('should parse minutes', () => {
      expect(parseJwtTime('15m', '15m')).toBe(15 * 60 * 1000);
    });

    it('should parse hours', () => {
      expect(parseJwtTime('24h', '15m')).toBe(24 * 60 * 60 * 1000);
    });

    it('should parse days', () => {
      expect(parseJwtTime('7d', '15m')).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('should default to seconds when no unit provided', () => {
      expect(parseJwtTime('60', '15m')).toBe(60 * 1000);
    });
  });

  describe('with undefined value', () => {
    it('should use default value', () => {
      expect(parseJwtTime(undefined, '15m')).toBe(15 * 60 * 1000);
    });
  });

  describe('with invalid formats', () => {
    it('should throw error for invalid format', () => {
      expect(() => parseJwtTime('invalid', '15m')).toThrow('Invalid JWT time format: invalid');
    });

    it('should throw error for empty string', () => {
      expect(() => parseJwtTime('', '15m')).toThrow('Invalid JWT time format: ');
    });
  });
});
