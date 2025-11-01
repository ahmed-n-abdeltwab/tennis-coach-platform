import { StringValue } from 'ms';

export const parseJwtTime = (
  value: string | undefined,
  defaultValue: string
): number | StringValue => {
  const raw = value ?? defaultValue;
  return /^\d+$/.test(raw) ? Number(raw) : (raw as StringValue);
};
