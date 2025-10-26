import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.url({
    message: 'DATABASE_URL must be a valid URL',
  }),
  DATABASE: z.string().default('tennis_coach_db'),
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+(s|m|h|d)?$/, {
      message: 'JWT_EXPIRES_IN must be a number or time string like 15m, 2h, or 1d',
    })
    .default('24h'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().positive().default(10),

  // PayPal
  PAYPAL_CLIENT_ID: z.string(),
  PAYPAL_CLIENT_SECRET: z.string(),
  PAYPAL_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),

  // Google
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_REDIRECT_URI: z.url(),

  // Email
  SMTP_SENDER_EMAIL: z.email(),
  SMTP_TOKEN: z.string(),

  // App
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  FRONTEND_URL: z.url().default('http://localhost:4200'),
  npm_package_version: z.string().default('1.0.0'),

  // Redis (optional)
  REDIS_URL: z.url().optional(),

  // Monitoring (optional)
  SENTRY_DSN: z.url().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:', error.flatten().fieldErrors);
    } else {
      console.error('❌ Invalid environment variables:', error);
    }
    process.exit(1);
  }
}
