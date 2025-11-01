import { OpenAPIObject } from '@nestjs/swagger';
import fs from 'fs';
import path from 'path';

export async function generateApiRoutes(document: OpenAPIObject): Promise<void> {
  console.log('🚀 Generating API routes from Swagger metadata...\n');

  // Extract routes from Swagger paths
  const routes = extractRoutesFromSwaggerDoc(document);

  // Generate TypeScript code
  const code = generateCode(routes);

  // Write to file
  const outputPath = path.join(__dirname, '../constants/api-routes.registry.ts');
  console.log(outputPath);
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
function generateCode(routes: ExtractedRoute[]): string {
  const routesObject = routes
    .map(route => {
      const { method, path, operation } = route;

      // Extract parameters from Swagger
      const params = extractParamsType(operation.parameters);
      const query = extractQueryType(operation.parameters);
      const body = extractBodyType(operation);
      const response = extractResponseType(operation);

      const routeKey = `${method} ${path}`;

      return `  '${routeKey}': (\n    params: ${params},\n    query: ${query},\n    body: ${body}\n  ) => ${response},`;
    })
    .join('\n');

  return (
    `/**\n` +
    ` * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY\n` +
    ` * Generated from Swagger metadata: scripts/generate-routes-from-swagger.ts\n` +
    ` * Run: npm run generate:routes\n` +
    ` */\n\n` +
    `import { RouteHandler } from '@common/types/api-route';\n\n` +
    `export const API_ROUTES = {\n` +
    routesObject +
    `\n} as const;\n\n` +
    `export type AppRoutes = typeof API_ROUTES;\n` +
    `export type RouteKey = keyof AppRoutes;\n`
  );
}

/**
 * Extract parameter types from Swagger parameters
 */
function extractParamsType(parameters: any[]): string {
  if (!parameters) return 'void';

  const pathParams = parameters.filter(p => p.in === 'path');
  if (pathParams.length === 0) return 'void';

  const entries = pathParams.map(p => `${p.name}: string`).join('; ');
  return `{ ${entries} }`;
}

/**
 * Extract query parameter types from Swagger
 */
function extractQueryType(parameters: any[]): string {
  if (!parameters) return 'void';

  const queryParams = parameters.filter(p => p.in === 'query');
  if (queryParams.length === 0) return 'void';

  const entries = queryParams
    .map(p => {
      const type = getTypeFromSchema(p.schema);
      const optional = !p.required ? '?' : '';
      return `${p.name}${optional}: ${type}`;
    })
    .join('; ');
  return `{ ${entries} }`;
}

/**
 * Extract body type from Swagger requestBody
 */
function extractBodyType(operation: any): string {
  if (!operation.requestBody) return 'void';

  const schema = operation.requestBody.content?.['application/json']?.schema;
  if (!schema) return 'void';

  // Try to get the type name from $ref or title
  if (schema.$ref) {
    const typeName = schema.$ref.split('/').pop();
    return typeName || 'any';
  }

  return schema.title || 'any';
}

/**
 * Extract response type from Swagger responses
 */
function extractResponseType(operation: any): string {
  if (!operation.responses) return 'any';

  // Try 200 response first
  const successResponse = operation.responses['200'] || operation.responses['201'];
  if (!successResponse) return 'any';

  const schema = successResponse.content?.['application/json']?.schema;
  if (!schema) return 'any';

  // Get type name from $ref or title
  if (schema.$ref) {
    const typeName = schema.$ref.split('/').pop();
    return typeName || 'any';
  }

  if (schema.title) return schema.title;
  if (schema.type === 'array' && schema.items?.$ref) {
    const itemType = schema.items.$ref.split('/').pop();
    return `${itemType}[]`;
  }

  return 'any';
}

/**
 * Get TypeScript type from Swagger schema
 */
function getTypeFromSchema(schema: any): string {
  if (!schema) return 'any';

  switch (schema.type) {
    case 'string':
      return 'string';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      return `${getTypeFromSchema(schema.items)}[]`;
    default:
      return schema.$ref ? schema.$ref.split('/').pop() : 'any';
  }
}
