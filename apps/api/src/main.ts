/* eslint-disable no-console */
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app/app.module';
import { AppLoggerService } from './app/logger/app-logger.service';
import { HttpLoggingInterceptor } from './app/logger/http-logging.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { corsConfig, createRateLimiter } from './config/security.config';

async function bootstrap() {
  // Configure logger with environment-based log levels before application initialization
  const app = await NestFactory.create(AppModule, {
    logger: AppLoggerService.getLogLevels(),
  });

  // Use custom AppLoggerService
  const appLogger = app.get(AppLoggerService);
  app.useLogger(appLogger);

  // Register HTTP logging interceptor globally
  app.useGlobalInterceptors(new HttpLoggingInterceptor(appLogger));

  // Register global exception filter for consistent error responses
  app.useGlobalFilters(new GlobalExceptionFilter(appLogger));

  // Global prefix
  app.setGlobalPrefix('api');

  // Rate limiting - 100 requests per 15 minutes per IP
  app.use(createRateLimiter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );
  // CORS - use production-aware configuration
  app.enableCors(corsConfig);

  // API Documentation
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

  // Setup Swagger UI at /api/docs
  SwaggerModule.setup('api/docs', app, document);

  // Expose raw JSON at /api/docs-json for runtime API discovery
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get(
    '/api/docs-json',
    (_req: unknown, res: { json: (doc: OpenAPIObject) => void }) => {
      res.json(document);
    }
  );

  const port = parseInt(process.env.PORT ?? '3333', 10);

  await app.listen(port);
  console.log(`🚀 API is running on: http://localhost:${port}/api`);
  console.log(`📚 API docs: http://localhost:${port}/api/docs`);
  console.log(`📄 API JSON: http://localhost:${port}/api/docs-json`);
}

bootstrap();
