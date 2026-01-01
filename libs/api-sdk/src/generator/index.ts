/**
 * Generator module for creating TypeScript endpoint types from Swagger/OpenAPI documentation.
 *
 * This module provides:
 * - `generateEndpointsFromSwagger` - Generate TypeScript code from a Swagger document
 * - `generateEndpointsObject` - Generate a runtime object representation of endpoints
 *
 * For CLI usage, run:
 *   npx ts-node libs/api-sdk/src/generator/cli.ts [swagger-path] [output-path]
 */

export {
  generateEndpointsFromSwagger,
  generateEndpointsObject,
  type GenerationOptions,
} from './swagger-parser';
