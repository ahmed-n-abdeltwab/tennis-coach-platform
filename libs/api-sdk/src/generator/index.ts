/**
 * Generator module for creating TypeScript endpoint types from Swagger/OpenAPI documentation.
 *
 * This module provides:
 * - `generateEndpointsFromSwagger` - Generate TypeScript code from a Swagger document
 * - `generateEndpointsObject` - Generate a runtime object representation of endpoints
 *
 * For type generation, run:
 *   pnpm nx run api:generate-types
 */

export {
  generateEndpointsFromSwagger,
  generateEndpointsObject,
  type GenerationOptions,
} from './swagger-parser';
