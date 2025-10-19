import { registerAs } from '@nestjs/config';

export default registerAs('health', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  database: process.env.DATABASE || 'unknown',
  npmPackageVersion: process.env.npm_package_version || 'unknown',
}));
