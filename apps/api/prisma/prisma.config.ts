import { defineConfig, env } from '@prisma/config';
import path from 'node:path';

const configDir = path.dirname(__filename);

export default defineConfig({
  datasource: {
    url: env('DATABASE_URL'),
  },

  migrations: {
    path: path.resolve(configDir, 'migrations'),
    seed: `tsx ${path.resolve(configDir, 'seed.ts')}`,
  },

  views: {
    path: path.resolve(configDir, 'views'),
  },

  typedSql: {
    path: path.resolve(configDir, 'queries'),
  },

  engine: 'classic',
});
