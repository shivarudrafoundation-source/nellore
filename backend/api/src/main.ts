import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const isProduction = process.env.NODE_ENV === 'production';

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

  // Enforce CORS rules restricting access to official Siva Rudra domains
  app.enableCors({
    origin: [
      'https://sivarudrafoundation.com',
      'https://www.sivarudrafoundation.com',
      'https://admin.sivarudrafoundation.com',
      'https://judges.sivarudrafoundation.com',
      'https://stage.sivarudrafoundation.com',
      'https://my.sivarudrafoundation.com',
      // Support Vercel deployment subdomains
      /\.vercel\.app$/,
      // Support local dev environments
      /http:\/\/localhost:\d+/,
      /http:\/\/127\.0\.0\.1:\d+/,
    ],
    credentials: true,
  });

  const port = process.env.PORT || 4000;
  const server = await app.listen(port);

  // Configure HTTP Keep-Alive timeouts to prevent socket hangs during load bursts
  const httpServer = app.getHttpServer();
  if (httpServer) {
    httpServer.keepAliveTimeout = 65000;
    httpServer.headersTimeout = 66000;
  }

  console.log(`NestJS server initialized on port ${port}`);
}

bootstrap();
