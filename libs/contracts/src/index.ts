/**
 * API Contracts Library
 *
 * This library contains auto-generated TypeScript types from Swagger/OpenAPI documentation.
 * It serves as the single source of truth for API endpoint type definitions.
 *
 * To regenerate types: nx run contracts:generate
 *
 * The Endpoints type is available in two ways:
 * 1. Import explicitly: `import type { Endpoints } from '@contracts';`
 * 2. Use globally (no import needed): `type MyPath = keyof Endpoints;`
 *
 * @packageDocumentation
 */

// Export the Endpoints type for explicit imports
export type { Endpoints } from './endpoints.generated';

// Include global type declarations
// This makes Endpoints available globally when this library is imported
export * from './global';
