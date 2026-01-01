#!/usr/bin/env node
/**
 * CLI tool for generating TypeScript endpoint types from Swagger/OpenAPI documentation.
 *
 * Usage:
 *   npx ts-node libs/api-sdk/src/generator/cli.ts [swagger-path] [output-path]
 *
 * Arguments:
 *   swagger-path  Path to the swagger.json file (default: apps/api/swagger.json)
 *   output-path   Path for the generated TypeScript file (default: libs/contracts/src/endpoints.generated.ts)
 *
 * Example:
 *   npx ts-node libs/api-sdk/src/generator/cli.ts apps/api/swagger.json libs/contracts/src/endpoints.generated.ts
 */

import fs from 'fs';
import path from 'path';

import { generateEndpointsFromSwagger } from './swagger-parser';

const DEFAULT_SWAGGER_PATH = 'apps/api/swagger.json';
const DEFAULT_OUTPUT_PATH = 'libs/contracts/src/endpoints.generated.ts';

async function main(): Promise<void> {
  const swaggerPath = process.argv[2] || DEFAULT_SWAGGER_PATH;
  const outputPath = process.argv[3] || DEFAULT_OUTPUT_PATH;

  console.log('🚀 Generating API endpoint types from Swagger metadata...');
  console.log(`   - Swagger file: ${swaggerPath}`);
  console.log(`   - Output file: ${outputPath}`);

  // Check if swagger file exists
  if (!fs.existsSync(swaggerPath)) {
    console.error(`❌ Swagger file not found: ${swaggerPath}`);
    console.error('   Run "nx run api:build" first to generate swagger.json');
    process.exit(1);
  }

  // Read and parse swagger file
  let swagger: unknown;
  try {
    const content = fs.readFileSync(swaggerPath, 'utf-8');
    swagger = JSON.parse(content);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to parse swagger file: ${errorMessage}`);
    process.exit(1);
  }

  // Generate TypeScript code
  let code: string;
  try {
    code = generateEndpointsFromSwagger(
      swagger as Parameters<typeof generateEndpointsFromSwagger>[0]
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to generate endpoints: ${errorMessage}`);
    process.exit(1);
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  try {
    fs.mkdirSync(outputDir, { recursive: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to create output directory: ${errorMessage}`);
    process.exit(1);
  }

  // Write generated code to file
  try {
    fs.writeFileSync(outputPath, code);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to write output file: ${errorMessage}`);
    process.exit(1);
  }

  console.log(`✅ Generated endpoints at: ${outputPath}`);
}

main().catch(error => {
  console.error('❌ Generation failed:', error);
  process.exit(1);
});
