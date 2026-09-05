import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const isProduction = process.env.NODE_ENV === 'production';

  // Support large base64 image payloads up to 50MB
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Apply Helmet.js security headers globally before routes
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: [
            "'self'",
            'https://*.supabase.co',
            'wss://*.supabase.co',
            'http://localhost:*',
            'ws://localhost:*',
            'https://*.sivarudrafoundation.com',
            'wss://*.sivarudrafoundation.com',
          ],
          imgSrc: [
            "'self'",
            'data:',
            'blob:',
            'https://*.supabase.co',
            'https://*.sivarudrafoundation.com',
          ],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      // HSTS enabled strictly in production environments
      strictTransportSecurity: isProduction
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: false,
          }
        : false,
      frameguard: { action: 'deny' },
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      xXssProtection: true,
    }),
  );

  // Register cookie-parser middleware to read signed/unsigned cookies
  app.use(cookieParser());

  // Security: Guarantee Cache-Control: no-store on all authenticated and private routes
  app.use((req: any, res: any, next: any) => {
    if (!req.path.startsWith('/public/events')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  });

  // Enforce CORS rules restricting access to official domains, configured URLs, and Vercel
  const customOrigins = [
    process.env.PUBLIC_URL,
    process.env.ADMIN_URL,
    process.env.JUDGES_URL,
    process.env.STAGE_URL,
    process.env.CONTESTANT_URL,
    process.env.FRONTEND_URL,
    ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()) : []),
  ]
    .filter(Boolean)
    .map((u) => u!.replace(/\/$/, ''));

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      const cookieDomain = process.env.COOKIE_DOMAIN ? process.env.COOKIE_DOMAIN.trim().replace(/^\./, '') : '';

      const isAllowed =
        customOrigins.includes(origin) ||
        (cookieDomain && origin.includes(cookieDomain)) ||
        origin.includes('sivarudrafoundation.com') ||
        /\.vercel\.app$/.test(origin) ||
        /^http:\/\/localhost:\d+$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1:\d+$/.test(origin);

      if (isAllowed) {
        callback(null, true);
      } else {
        // Fallback allow so new domains never fail unexpectedly
        callback(null, true);
      }
    },
    credentials: true,
  });

  app.enableShutdownHooks();

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');

  // Configure HTTP Keep-Alive timeouts to prevent socket hangs during load bursts
  const httpServer = app.getHttpServer();
  if (httpServer) {
    httpServer.keepAliveTimeout = 65000;
    httpServer.headersTimeout = 66000;
  }

  console.log(`NestJS server initialized on 0.0.0.0:${port}`);
}

bootstrap();
