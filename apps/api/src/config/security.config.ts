import rateLimit, { Options } from 'express-rate-limit';
import helmet from 'helmet';

// Rate limiting configuration
export const createRateLimiter = (windowMs?: number, max?: number) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';

  // Environment-aware rate limiting
  let rateLimitConfig: { windowMs: number; max: number };

  if (isTest) {
    // Disable rate limiting in test environment
    rateLimitConfig = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10000, // Very high limit for tests
    };
  } else if (isProduction) {
    // Production: Strict rate limiting for security
    rateLimitConfig = {
      windowMs: windowMs ?? 15 * 60 * 1000, // 15 minutes
      max: max ?? 100, // 100 requests per 15 minutes
    };
  } else {
    // Development: Relaxed rate limiting for development workflow
    rateLimitConfig = {
      windowMs: windowMs ?? 15 * 60 * 1000, // 15 minutes
      max: max ?? 1000, // 1000 requests per 15 minutes
    };
  }

  const options: Partial<Options> = {
    windowMs: rateLimitConfig.windowMs,
    max: rateLimitConfig.max,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      limit: rateLimitConfig.max,
      windowMs: rateLimitConfig.windowMs,
      retryAfter: Math.ceil(rateLimitConfig.windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Use the default key generator which properly handles IPv6
    // The default uses req.ip which is already normalized by express
    validate: {
      // Disable the IPv6 validation since we're using the default key generator
      // which already handles IPv6 properly
      xForwardedForHeader: false,
    },
  };

  // Add development debugging by logging when creating the rate limiter
  if (!isProduction) {
    console.log(
      `[RATE LIMIT] Configured for ${isTest ? 'TEST' : 'DEVELOPMENT'}: ${rateLimitConfig.max} requests per ${rateLimitConfig.windowMs / 1000}s`
    );
  }

  return rateLimit(options);
};

// Helmet security configuration
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'https://api.paypal.com', 'https://www.google.com'],
      frameSrc: ["'self'", 'https://www.paypal.com'],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// CORS configuration
export const corsConfig = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const frontendUrl = process.env.FRONTEND_URL;

    // Build allowed origins based on environment
    const allowedOrigins: string[] = [];

    // Always allow the configured FRONTEND_URL if set
    if (frontendUrl) {
      allowedOrigins.push(frontendUrl);
    }

    // Only allow localhost origins in development
    if (!isProduction) {
      allowedOrigins.push('http://localhost:4200', 'http://localhost:3000');
    }

    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Enhanced error message for debugging
      const errorMessage = isProduction
        ? 'Not allowed by CORS'
        : `CORS: Origin '${origin}' not allowed. Allowed origins: ${allowedOrigins.join(', ')}`;

      if (!isProduction) {
        console.warn(`[CORS] Blocked request from origin: ${origin}`);
        console.warn(`[CORS] Allowed origins: ${allowedOrigins.join(', ')}`);
      }

      callback(new Error(errorMessage));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  // Explicitly allow common headers
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
    'Expires',
  ],
  // Explicitly allow common methods
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  // Expose headers that the frontend might need
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
};
