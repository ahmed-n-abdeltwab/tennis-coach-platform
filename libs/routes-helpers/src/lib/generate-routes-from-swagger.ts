import fs from 'fs';
import path from 'path';

import {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  PathItemObject,
  ReferenceObject,
  SchemaObject,
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { ExtractedRoute } from '../interfaces/IRoutes';
import { getWorkspaceRoot } from '../utils/routes.util';

/**
 * Configuration options for route generation
 */
export interface GenerationOptions {
  /**
   * Whether to inline DTO properties instead of using type names
   * @default true
   */
  inlineDTOs?: boolean;

  /**
   * Whether to generate utility types alongside the Endpoints interface
   * @default true
   */
  generateUtilityTypes?: boolean;

  /**
   * Whether to generate JSON schemas for runtime validation
   * @default false
   */
  generateSchemas?: boolean;

  /**
   * Custom output path for the generated file
   * If not provided, uses default location in routes-helpers library
   */
  outputPath?: string;
}

/**
 * Generates the Endpoints interface from Swagger document
 * Returns the TypeScript code as a string (in memory)
 *
 * @param document - The OpenAPI/Swagger document
 * @param options - Configuration options for generation behavior
 * @returns The generated TypeScript code as a string
 */
export function generateEndpointsInterface(
  document: OpenAPIObject,
  options: GenerationOptions = {}
): string {
  // Apply default options
  const config: Required<GenerationOptions> = {
    inlineDTOs: options.inlineDTOs ?? true,
    generateUtilityTypes: options.generateUtilityTypes ?? true,
    generateSchemas: options.generateSchemas ?? false,
    outputPath: options.outputPath ?? '',
  };

  const routes = extractRoutesFromSwaggerDoc(document);
  return generateCode(routes, document, config);
}

/**
 * Generates the Endpoints structure as a runtime object (in memory)
 * This can be used programmatically without needing to import the type
 */
export function generateEndpointsObject(
  document: OpenAPIObject
): Record<string, Record<string, unknown>> {
  const routes = extractRoutesFromSwaggerDoc(document);
  const endpoints: Record<string, Record<string, unknown>> = {};

  // Group routes by path
  const routesByPath = new Map<string, ExtractedRoute[]>();
  routes.forEach(route => {
    const path = route.path;
    if (!routesByPath.has(path)) {
      routesByPath.set(path, []);
    }
    routesByPath.get(path)!.push(route);
  });

  // Build the endpoints object
  routesByPath.forEach((pathRoutes, path) => {
    const methods: Record<string, any> = {};

    pathRoutes.forEach(route => {
      const { method, operation } = route;
      const isGet = method === 'GET';

      const paramType = isGet
        ? extractParams(document, operation.parameters)
        : extractBody(operation.requestBody, document);

      const paramName = isGet ? 'params' : 'body';
      const response = extractResponseType(operation, document);

      methods[method] = {
        [paramName]: paramType,
        responseType: response,
      } as Record<string, unknown>;
    });

    endpoints[path] = methods;
  });

  return endpoints;
}

/**
 * Generates API routes from Swagger document with configurable options
 *
 * @param document - The OpenAPI/Swagger document
 * @param options - Configuration options for generation behavior
 *
 * @example
 * // Use default options
 * await generateApiRoutes(document);
 *
 * @example
 * // Custom configuration
 * await generateApiRoutes(document, {
 *   inlineDTOs: true,
 *   generateUtilityTypes: true,
 *   generateSchemas: false,
 *   outputPath: './custom/path/routes.ts'
 * });
 */
export async function generateApiRoutes(
  document: OpenAPIObject,
  options: GenerationOptions = {}
): Promise<void> {
  // Apply default options
  const config: Required<GenerationOptions> = {
    inlineDTOs: options.inlineDTOs ?? true,
    generateUtilityTypes: options.generateUtilityTypes ?? true,
    generateSchemas: options.generateSchemas ?? false,
    outputPath:
      options.outputPath ??
      path.join(getWorkspaceRoot(), 'libs/routes-helpers/src/constants/api-routes.registry.ts'),
  };

  console.log('🚀 Generating API routes from Swagger metadata...');
  console.log(`   - Inline DTOs: ${config.inlineDTOs}`);
  console.log(`   - Generate Utility Types: ${config.generateUtilityTypes}`);
  console.log(`   - Generate Schemas: ${config.generateSchemas}\n`);

  // Extract routes from Swagger paths
  const routes = extractRoutesFromSwaggerDoc(document);

  // Generate TypeScript code (in memory)
  const code = generateCode(routes, document, config);

  // Ensure the directory exists
  const outputDir = path.dirname(config.outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  // Write to file
  fs.writeFileSync(config.outputPath, code);

  console.log(`✅ Generated ${routes.length} routes`);
  console.log(`📝 Written to: ${config.outputPath}\n`);
}

/**
 * Extracts route information from Swagger document
 */

function extractRoutesFromSwaggerDoc(document: OpenAPIObject): ExtractedRoute[] {
  const routes: ExtractedRoute[] = [];

  // Iterate through all paths in Swagger document
  Object.entries(document.paths).forEach(([pathKey, pathObject]: [string, PathItemObject]) => {
    // Iterate through all HTTP methods
    Object.entries(pathObject).forEach(([method, operation]: [string, OperationObject]) => {
      // Skip non-HTTP method keys like 'parameters'
      if (!['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
        return;
      }

      routes.push({
        method: method.toUpperCase(),
        path: pathKey,
        operation,
      });
    });
  });

  return routes;
}

/**
 * Generates TypeScript code from extracted routes
 */
function generateCode(
  routes: ExtractedRoute[],
  document: OpenAPIObject,
  config: Required<GenerationOptions>
): string {
  // Group routes by path
  const routesByPath = new Map<string, ExtractedRoute[]>();

  routes.forEach(route => {
    const path = route.path;
    if (!routesByPath.has(path)) {
      routesByPath.set(path, []);
    }
    routesByPath.get(path)!.push(route);
  });

  // Generate interface entries grouped by path
  const interfaceEntries: string[] = [];

  routesByPath.forEach((pathRoutes, path) => {
    // Sort methods alphabetically for consistency
    pathRoutes.sort((a, b) => a.method.localeCompare(b.method));

    const methodEntries: string[] = [];
    pathRoutes.forEach(route => {
      const { method, operation } = route;

      if (method === 'GET') {
        const paramType = extractParams(document, operation.parameters);
        const response = extractResponseType(operation, document);
        methodEntries.push(`    ${method}: (params: ${paramType}) => ${response};`);
      } else {
        // For non-GET: extract body, return undefined if none
        const bodyType = extractBody(operation.requestBody, document);
        const response = extractResponseType(operation, document);
        methodEntries.push(`    ${method}: (body: ${bodyType}) => ${response};`);
      }
    });

    interfaceEntries.push(`  "${path}": {\n${methodEntries.join('\n')}\n  };`);
  });

  // Sort paths alphabetically for consistency
  interfaceEntries.sort();

  const interfaceBody = interfaceEntries.join('\n\n');

  // Build the output code
  let code = '';

  // Add header comment
  code += `/**\n`;
  code += ` * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY\n`;
  code += ` * Generated from Swagger metadata\n`;
  code += ` * \n`;
  code += ` * Generation Options:\n`;
  code += ` * - Inline DTOs: ${config.inlineDTOs}\n`;
  code += ` * - Generate Utility Types: ${config.generateUtilityTypes}\n`;
  code += ` * - Generate Schemas: ${config.generateSchemas}\n`;
  code += ` */\n\n`;

  // Add Endpoints interface
  code += `export interface Endpoints {\n${interfaceBody}\n}\n`;

  // Optionally add utility types (for future use if needed inline)
  if (config.generateUtilityTypes) {
    code += `\n`;
    code += `/**\n`;
    code += ` * Utility types are exported from @routes-helpers\n`;
    code += ` * Import them using: import { ExtractPaths, ExtractMethods, ... } from '@routes-helpers';\n`;
    code += ` */\n`;
  }

  // Optionally add JSON schemas (placeholder for future implementation)
  if (config.generateSchemas) {
    code += `\n`;
    code += `/**\n`;
    code += ` * JSON Schemas for runtime validation\n`;
    code += ` * TODO: Implement schema generation\n`;
    code += ` */\n`;
    code += `export const EndpointSchemas = {};\n`;
  }

  return code;
}

function isReferenceObject(obj: any): obj is ReferenceObject {
  return obj && typeof obj === 'object' && '$ref' in obj;
}

function isSchemaObject(obj: any): obj is SchemaObject {
  return obj && typeof obj === 'object' && !('$ref' in obj);
}

function isParameterObject(obj: ParameterObject | ReferenceObject): obj is ParameterObject {
  return 'in' in obj && 'name' in obj;
}
/**
 * Extracts path and query parameters for GET requests
 * Returns undefined if no parameters exist
 * Deduplicates properties by keeping the last occurrence
 */
function extractParams(
  document: OpenAPIObject,
  parameters?: (ParameterObject | ReferenceObject)[]
): string {
  // Use a Map to track properties, keeping the last occurrence
  const propertyMap = new Map<string, string>();
  if (!parameters || parameters.length === 0) {
    return 'undefined | never';
  }
  // Extract path parameters first

  const pathParams: ParameterObject[] = parameters
    .filter(isParameterObject)
    .filter(p => p.in === 'path');

  pathParams.forEach((p: ParameterObject) => {
    propertyMap.set(p.name, `${p.name}: string`);
  });

  // Extract query parameters second (will override path params if duplicate)
  const queryParams = parameters.filter(isParameterObject).filter(p => p.in === 'query');
  queryParams.forEach((p: ParameterObject): void => {
    if ('schema' in p && p.schema) {
      const type = schemaToTypeScript(p.schema, document);
      const optional = !p.required ? '?' : '';
      propertyMap.set(p.name, `${p.name}${optional}: ${type}`);
    }
  });

  if (propertyMap.size === 0) {
    return 'undefined | never';
  }

  // Combine all parts into a single object type
  const properties = Array.from(propertyMap.values());
  return `{ ${properties.join('; ')} }`;
}

/**
 * Extracts body for POST/PUT/PATCH/DELETE requests
 * Returns undefined if no body exists
 */
function extractBody(requestBody: any, document: OpenAPIObject): string {
  if (!requestBody) {
    return 'undefined';
  }

  const schema = requestBody.content?.['application/json']?.schema;
  if (!schema) {
    return 'undefined';
  }

  const bodyType = schemaToTypeScript(schema, document);
  return bodyType;
}

/**
 * Extract response type from Swagger responses
 * Returns 'void' for 204 No Content responses, 'unknown' for missing schemas
 */
function extractResponseType(operation: any, document: OpenAPIObject): string {
  if (!operation.responses) return 'unknown';

  // Check for 204 No Content first
  if (operation.responses['204']) {
    return 'void';
  }

  // Try 200 response first, then 201, 202, etc.
  const successResponse =
    operation.responses['200'] || operation.responses['201'] || operation.responses['202'];

  if (!successResponse) return 'unknown';

  const schema = successResponse.content?.['application/json']?.schema;
  if (!schema) {
    // If there's a successful response but no schema, it's likely void
    return 'void';
  }

  return schemaToTypeScript(schema, document);
}

/**
 * Resolves a $ref reference to the actual schema from the document
 */
function resolveRef<T>(refObj: ReferenceObject | T, document: OpenAPIObject): T {
  if (!isReferenceObject(refObj)) {
    return refObj;
  }

  const ref = refObj.$ref;

  if (!ref.startsWith('#/')) {
    throw new Error(`External references not supported: ${ref}`);
  }

  const path = ref.slice(2).split('/');
  let current: any = document;

  for (const key of path) {
    current = current?.[key];
    if (current === undefined) {
      throw new Error(`Invalid reference: ${ref}`);
    }
  }

  return resolveRef(current, document);
}

/**
 * Converts a Swagger schema to a TypeScript type string
 * Handles objects, arrays, primitives, $ref, allOf, oneOf, anyOf
 * Inlines DTO properties instead of using type names
 */
function schemaToTypeScript(
  schema: SchemaObject | ReferenceObject,
  document: OpenAPIObject,
  visited: Set<string> = new Set()
): string {
  if (!schema) return 'unknown';

  // Handle $ref - resolve the reference and inline its properties
  if (isReferenceObject(schema) && schema.$ref) {
    const refPath = schema.$ref;
    // Prevent infinite recursion
    if (visited.has(refPath)) {
      return schema.$ref.split('/').pop() || 'unknown';
    }

    visited.add(refPath);
    const resolved = resolveRef(schema, document);

    if (resolved) {
      // Recursively convert the resolved schema to inline its properties
      return schemaToTypeScript(resolved as SchemaObject, document, visited);
    }

    // Fallback to just the type name from ref if we can't resolve
    visited.delete(refPath);
    return refPath.split('/').pop() || 'unknown';
  }

  // Handle allOf - merge all schemas and combine their properties
  if (isSchemaObject(schema) && schema.allOf && Array.isArray(schema.allOf)) {
    // Resolve all schemas in allOf
    const resolvedSchemas = schema.allOf.map((s: any) => {
      if (s.$ref) {
        const resolved = resolveRef(s.$ref, document);
        return resolved || s;
      }
      return s;
    });

    // Merge all properties from allOf schemas
    // Use a Map to deduplicate, keeping properties from later schemas (last occurrence)
    const mergedProperties = new Map<string, { schema: any; required: boolean }>();
    const mergedRequired: string[] = [];

    resolvedSchemas.forEach((s: any) => {
      if (s.properties) {
        Object.entries(s.properties).forEach(([key, propSchema]: [string, any]) => {
          const required =
            (s.required && s.required.includes(key)) ||
            (schema.required && schema.required.includes(key));
          // Set will overwrite previous occurrences, keeping the last one
          mergedProperties.set(key, { schema: propSchema, required });
        });
      }
      if (s.required && Array.isArray(s.required)) {
        mergedRequired.push(...s.required);
      }
    });

    // If we have merged properties, create an inline object type
    if (mergedProperties.size > 0) {
      const properties = Array.from(mergedProperties.entries()).map(
        ([key, { schema: propSchema, required }]) => {
          const propType = schemaToTypeScript(propSchema, document, visited);
          const optional = required ? '' : '?';
          return `${key}${optional}: ${propType}`;
        }
      );
      return `{ ${properties.join('; ')} }`;
    }

    // Fallback to intersection type if no properties to merge
    const types = resolvedSchemas.map((s: any) => schemaToTypeScript(s, document, visited));
    return types.length === 1 ? (types[0] ?? 'unknown') : types.join(' & ');
  }

  // Handle oneOf/anyOf - union types
  if (isSchemaObject(schema)) {
    const unionSchemas = schema.oneOf || schema.anyOf;
    if (unionSchemas && Array.isArray(unionSchemas)) {
      const types = unionSchemas.map((s: any) => schemaToTypeScript(s, document, visited));
      return types.join(' | ');
    }

    // Handle arrays
    if (schema.type === 'array') {
      if (schema.items) {
        const itemType = schemaToTypeScript(schema.items, document, visited);
        return `${itemType}[]`;
      }
      return 'unknown[]';
    }

    // Handle objects with properties - this is where we inline DTO properties
    if (schema.type === 'object' || schema.properties) {
      if (schema.properties && Object.keys(schema.properties).length > 0) {
        // Use a Map to deduplicate properties, keeping the last occurrence
        const propertyMap = new Map<string, string>();

        Object.entries(schema.properties).forEach(([key, propSchema]: [string, any]) => {
          const propType = schemaToTypeScript(propSchema, document, visited);
          const required = schema.required && schema.required.includes(key);
          const optional = required ? '' : '?';
          // Set will overwrite previous occurrences, keeping the last one
          propertyMap.set(key, `${key}${optional}: ${propType}`);
        });

        const properties = Array.from(propertyMap.values());
        return `{ ${properties.join('; ')} }`;
      }
      // Check if this is a Date type (format: date-time or date)
      // NestJS/Swagger sometimes represents Date as object with format
      if (schema.format === 'date' || schema.format === 'date-time') {
        return 'string';
      }
      // Empty object or object without properties
      return 'Record<string, unknown>';
    }

    // Handle primitives
    switch (schema.type) {
      case 'string':
        if (schema.enum) {
          return schema.enum.map((v: any) => `"${v}"`).join(' | ');
        }
        // Handle date/datetime formats as ISO string
        if (schema.format === 'date' || schema.format === 'date-time') {
          return 'string';
        }
        return 'string';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'null':
        return 'null';
      default:
        // If schema has a title, use it
        if (schema.title) {
          return schema.title;
        }
        return 'unknown';
    }
  }

  return 'unknown';
}
