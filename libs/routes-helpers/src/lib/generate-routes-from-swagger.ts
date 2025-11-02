import fs from 'fs';
import path from 'path';

import { OpenAPIObject } from '@nestjs/swagger';

/**
 * Generates the Endpoints interface from Swagger document
 * Returns the TypeScript code as a string (in memory)
 */
export function generateEndpointsInterface(document: OpenAPIObject): string {
  const routes = extractRoutesFromSwaggerDoc(document);
  return generateCode(routes, document);
}

/**
 * Generates the Endpoints structure as a runtime object (in memory)
 * This can be used programmatically without needing to import the type
 */
export function generateEndpointsObject(
  document: OpenAPIObject
): Record<string, Record<string, any>> {
  const routes = extractRoutesFromSwaggerDoc(document);
  const endpoints: Record<string, Record<string, any>> = {};

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
        ? extractParams(operation.parameters, document)
        : extractBody(operation.requestBody, document);

      const paramName = isGet ? 'params' : 'body';
      const response = extractResponseType(operation, document);

      methods[method] = {
        [paramName]: paramType,
        responseType: response,
      };
    });

    endpoints[path] = methods;
  });

  return endpoints;
}

/**
 * Gets the workspace root path regardless of whether we're in src or dist
 */
function getWorkspaceRoot(): string {
  // If running from dist, go up to the project root
  if (__dirname.includes('/dist/')) {
    const distIndex = __dirname.indexOf('/dist/');
    return __dirname.substring(0, distIndex);
  }
  // If already in src, go up to find workspace root (typically 3-4 levels up from apps/api/src)
  // __dirname might be: /workspace/apps/api/src/common/scripts
  // We want: /workspace
  let current = __dirname;
  while (current !== path.dirname(current)) {
    // Check if we're at the workspace root (has node_modules or nx.json)
    if (
      fs.existsSync(path.join(current, 'nx.json')) ||
      fs.existsSync(path.join(current, 'node_modules'))
    ) {
      return current;
    }
    current = path.dirname(current);
  }
  // Fallback: assume we're 4 levels up from the script
  return path.join(__dirname, '..', '..', '..', '..');
}

export async function generateApiRoutes(document: OpenAPIObject): Promise<void> {
  console.log('🚀 Generating API routes from Swagger metadata...\n');

  // Extract routes from Swagger paths
  const routes = extractRoutesFromSwaggerDoc(document);

  // Generate TypeScript code (in memory)
  const code = generateCode(routes, document);

  // Write to routes-helpers library so it can be shared across projects
  const workspaceRoot = getWorkspaceRoot();
  const outputPath = path.join(
    workspaceRoot,
    'libs/routes-helpers/src/constants/api-routes.registry.ts'
  );
  // Ensure the directory exists
  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(outputPath, code);

  console.log(`✅ Generated ${routes.length} routes`);
  console.log(`📝 Written to: ${outputPath}\n`);
}

/**
 * Extracts route information from Swagger document
 */
interface ExtractedRoute {
  method: string;
  path: string;
  operation: any;
}

function extractRoutesFromSwaggerDoc(document: any): ExtractedRoute[] {
  const routes: ExtractedRoute[] = [];

  // Iterate through all paths in Swagger document
  Object.entries(document.paths || {}).forEach(([pathKey, pathObject]: [string, any]) => {
    // Iterate through all HTTP methods
    Object.entries(pathObject).forEach(([method, operation]: [string, any]) => {
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
function generateCode(routes: ExtractedRoute[], document: OpenAPIObject): string {
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
      const isGet = method === 'GET';

      if (isGet) {
        // For GET: extract params (path + query), return undefined if none
        const paramType = extractParams(operation.parameters, document);
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

  return (
    `/**\n` +
    ` * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY\n` +
    ` * Generated from Swagger metadata: scripts/generate-routes-from-swagger.ts\n` +
    ` * Run: npm run generate:routes\n` +
    ` */\n\n` +
    `export interface Endpoints {\n${interfaceBody}\n}\n`
  );
}

/**
 * Extracts path and query parameters for GET requests
 * Returns undefined if no parameters exist
 * Deduplicates properties by keeping the last occurrence
 */
function extractParams(parameters: any[], document: OpenAPIObject): string {
  // Use a Map to track properties, keeping the last occurrence
  const propertyMap = new Map<string, string>();

  // Extract path parameters first
  if (parameters) {
    const pathParams = parameters.filter(p => p.in === 'path');
    pathParams.forEach(p => {
      propertyMap.set(p.name, `${p.name}: string`);
    });
  }

  // Extract query parameters second (will override path params if duplicate)
  if (parameters) {
    const queryParams = parameters.filter(p => p.in === 'query');
    queryParams.forEach(p => {
      const type = schemaToTypeScript(p.schema, document);
      const optional = !p.required ? '?' : '';
      propertyMap.set(p.name, `${p.name}${optional}: ${type}`);
    });
  }

  if (propertyMap.size === 0) {
    return 'undefined';
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
 */
function extractResponseType(operation: any, document: OpenAPIObject): string {
  if (!operation.responses) return 'any';

  // Try 200 response first, then 201, 204, etc.
  const successResponse =
    operation.responses['200'] ||
    operation.responses['201'] ||
    operation.responses['204'] ||
    operation.responses['202'];

  if (!successResponse) return 'any';

  const schema = successResponse.content?.['application/json']?.schema;
  if (!schema) return 'any';

  return schemaToTypeScript(schema, document);
}

/**
 * Resolves a $ref reference to the actual schema from the document
 */
function resolveRef(ref: string, document: OpenAPIObject): any {
  if (!ref || !ref.startsWith('#/')) return null;

  const parts = ref.split('/').slice(1); // Remove the '#'
  let current: any = document;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }

  return current;
}

/**
 * Converts a Swagger schema to a TypeScript type string
 * Handles objects, arrays, primitives, $ref, allOf, oneOf, anyOf
 * Inlines DTO properties instead of using type names
 */
function schemaToTypeScript(
  schema: any,
  document: OpenAPIObject,
  visited: Set<string> = new Set()
): string {
  if (!schema) return 'any';

  // Handle $ref - resolve the reference and inline its properties
  if (schema.$ref) {
    const refPath = schema.$ref;
    // Prevent infinite recursion
    if (visited.has(refPath)) {
      return schema.$ref.split('/').pop() || 'any';
    }

    visited.add(refPath);
    const resolved = resolveRef(refPath, document);

    if (resolved) {
      // Recursively convert the resolved schema to inline its properties
      return schemaToTypeScript(resolved, document, visited);
    }

    // Fallback to just the type name from ref if we can't resolve
    visited.delete(refPath);
    return refPath.split('/').pop() || 'any';
  }

  // Handle allOf - merge all schemas and combine their properties
  if (schema.allOf && Array.isArray(schema.allOf)) {
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
    return types.length === 1 ? types[0] : types.join(' & ');
  }

  // Handle oneOf/anyOf - union types
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
    return 'any[]';
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
    // Empty object or object without properties
    return 'Record<string, any>';
  }

  // Handle primitives
  switch (schema.type) {
    case 'string':
      if (schema.enum) {
        return schema.enum.map((v: any) => `"${v}"`).join(' | ');
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
      return 'any';
  }
}
