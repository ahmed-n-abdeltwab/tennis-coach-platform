#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * CLI script to generate TypeScript endpoint types from the API's Swagger documentation.
 *
 * This script:
 * 1. Sets mock environment variables (only Swagger metadata is needed, not real connections)
 * 2. Bootstraps the NestJS application (without starting the server)
 * 3. Generates the Swagger/OpenAPI document
 * 4. Parses the document and generates TypeScript types
 * 5. Writes the types to libs/contracts/src/endpoints.generated.ts
 *
 * Usage:
 *   pnpm nx run api:generate-types
 *
 * This should be run:
 * - During development when API endpoints change
 * - In CI/CD before building the frontend
 * - Via pre-commit hook to keep types in sync
 */

// Set mock environment variables BEFORE any imports that trigger validation
// These are only needed to pass validation - no actual connections are made
process.env.DATABASE_URL ??= 'postgresql://mock:mock@localhost:5432/mock';
process.env.JWT_SECRET ??= 'mock-jwt-secret-for-type-generation';
process.env.JWT_REFRESH_SECRET ??= 'mock-jwt-refresh-secret-for-type-generation';
process.env.PAYPAL_CLIENT_ID ??= 'mock-paypal-client-id';
process.env.PAYPAL_CLIENT_SECRET ??= 'mock-paypal-client-secret';
process.env.GOOGLE_CLIENT_ID ??= 'mock-google-client-id';
process.env.GOOGLE_CLIENT_SECRET ??= 'mock-google-client-secret';
process.env.GOOGLE_REDIRECT_URI ??= 'http://localhost:3000/auth/google/callback';
process.env.SMTP_SENDER_EMAIL ??= 'mock@example.com';
process.env.SMTP_TOKEN ??= 'mock-smtp-token';
process.env.REDIS_HOST ??= 'localhost';
process.env.REDIS_PORT ??= '6379';

import fs from 'fs';
import path from 'path';

import { generateEndpointsFromSwagger } from '@api-sdk';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from '../src/app/app.module';

// Paths relative to workspace root (script runs from apps/api/)
const WORKSPACE_ROOT = path.resolve(__dirname, '../../..');
const OUTPUT_PATH = path.join(WORKSPACE_ROOT, 'libs/contracts/src/endpoints.generated.ts');

async function generateTypes(): Promise<void> {
  console.log('🚀 Generating API endpoint types...');

  // Create the NestJS application without starting the server
  // Enable minimal logging to catch initialization errors
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });

  app.setGlobalPrefix('api');

  // Build the Swagger document (same config as main.ts)
  const options = new DocumentBuilder()
    .setTitle('Tennis Coach API')
    .setDescription('API for tennis coach booking platform')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth'
    )
    .build();

  const document = SwaggerModule.createDocument(app, options);

  // Generate TypeScript code
  const code = generateEndpointsFromSwagger(document);

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_PATH);
  fs.mkdirSync(outputDir, { recursive: true });

  // Write generated code
  fs.writeFileSync(OUTPUT_PATH, code);
  console.log(`✅ Generated endpoint types at: ${OUTPUT_PATH}`);

  // Close the application
  await app.close();
}

generateTypes()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Generation failed:');
    console.error(error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  });
