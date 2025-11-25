/* eslint-disable no-console */
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { generateApiRoutes } from '@routes-helpers';

import { AppModule } from './app/app.module';
import { AppLoggerService } from './app/logger/app-logger.service';
import { HttpLoggingInterceptor } from './app/logger/http-logging.interceptor';

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

  // Global prefix
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );
  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:4200',
    credentials: true,
  });

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
  SwaggerModule.setup('api/docs', app, document);

  generateApiRoutes(document).catch(error => {
    console.error('❌ Error generating routes:', error);
    process.exit(1);
  });

  const port = parseInt(process.env.PORT ?? '3333', 10);

  await app.listen(port);
  console.log(`🚀 API is running on: http://localhost:${port}/api`);
  console.log(`📚 API docs: http://localhost:${port}/api/docs`);
}

bootstrap();
