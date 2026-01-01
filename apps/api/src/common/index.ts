// Decorators
export * from './decorators/api-responses.decorator';
export * from './decorators/authenticated-controller.decorator';
export * from './decorators/typed-api-responses.decorator';

// Controllers
export * from './controllers/base.controller';

// Services
export * from './services/base.service';

// Filters
export * from './filters/global-exception.filter';

// DTOs
export * from './dto/base-response.dto';

// Utils
export * from './utils/pagination.helper';

// Endpoints (dynamically generated from Swagger, shared from contracts)
export type { Endpoints } from '@contracts';

// API SDK utilities for type-safe API interactions
export type {
  ExtractPaths,
  ExtractMethods,
  ExtractRequestType,
  ExtractResponseType,
  PathsWithMethod,
  PathsForRoute,
  RequiresParams,
  ExtractPathParams,
} from '@api-sdk';
export { buildPath } from '@api-sdk';
