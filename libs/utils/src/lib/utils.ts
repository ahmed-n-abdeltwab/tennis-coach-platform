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
