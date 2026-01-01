/**
 * Parses a JWT time string (e.g., "15m", "24h", "30s", "7d") into milliseconds.
 *
 * @param value - The time string to parse, or undefined to use the default
 * @param defaultValue - The default time string to use if value is undefined
 * @returns The time in milliseconds
 * @throws Error if the format is invalid
 *
 * @example
 * parseJwtTime('15m', '24h') // returns 900000 (15 minutes in ms)
 * parseJwtTime(undefined, '24h') // returns 86400000 (24 hours in ms)
 * parseJwtTime('30s', '15m') // returns 30000 (30 seconds in ms)
 */
export const parseJwtTime = (value: string | undefined, defaultValue: string): number => {
  const raw = value ?? defaultValue;

  // Support formats like "15m", "24h", "30s"
  const match = raw.match(/^(\d+)([smhd])?$/);

  if (!match) {
    throw new Error(`Invalid JWT time format: ${raw}`);
  }

  const amount = Number(match[1]);
  const unit = match[2] ?? 's'; // default seconds

  switch (unit) {
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60 * 1000;
    case 'h':
      return amount * 60 * 60 * 1000;
    case 'd':
      return amount * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unknown time unit: ${unit}`);
  }
};
