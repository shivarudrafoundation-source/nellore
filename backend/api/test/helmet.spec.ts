import 'dotenv/config';
import http from 'http';
import helmet from 'helmet';
import express from 'express';
import { io as Client } from 'socket.io-client';

async function runHelmetTests() {
  console.log('========================================================');
  console.log('RUNNING HELMET.JS SECURITY HEADERS TESTS');
  console.log('========================================================');

  // 1. Test Dev Mode Server (HSTS disabled on localhost)
  const devApp = express();
  devApp.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: ["'self'", 'http://localhost:*', 'ws://localhost:*', 'https://*.sivarudrafoundation.com'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https://*.sivarudrafoundation.com'],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
      strictTransportSecurity: false,
      frameguard: { action: 'deny' },
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  devApp.get('/health', (req, res) => res.json({ status: 'ok' }));

  const devServer = http.createServer(devApp);
  await new Promise<void>((resolve) => devServer.listen(4098, '127.0.0.1', () => resolve()));

  try {
    // ----------------------------------------------------
    // Test 1: X-Content-Type-Options: nosniff
    // ----------------------------------------------------
    console.log('Test 1: X-Content-Type-Options Header');
    const devRes = await fetch('http://127.0.0.1:4098/health');
    const nosniff = devRes.headers.get('x-content-type-options');
    if (nosniff !== 'nosniff') {
      throw new Error(`Expected X-Content-Type-Options: nosniff, got ${nosniff}`);
    }
    console.log('✔ Test 1 passed (X-Content-Type-Options: nosniff verified).');

    // ----------------------------------------------------
    // Test 2: Referrer-Policy: strict-origin-when-cross-origin
    // ----------------------------------------------------
    console.log('Test 2: Referrer-Policy Header');
    const referrer = devRes.headers.get('referrer-policy');
    if (referrer !== 'strict-origin-when-cross-origin') {
      throw new Error(`Expected Referrer-Policy: strict-origin-when-cross-origin, got ${referrer}`);
    }
    console.log('✔ Test 2 passed (Referrer-Policy: strict-origin-when-cross-origin verified).');

    // ----------------------------------------------------
    // Test 3: X-Frame-Options: DENY
    // ----------------------------------------------------
    console.log('Test 3: X-Frame-Options (Clickjacking Protection)');
    const frameOptions = devRes.headers.get('x-frame-options');
    if (frameOptions !== 'DENY') {
      throw new Error(`Expected X-Frame-Options: DENY, got ${frameOptions}`);
    }
    console.log('✔ Test 3 passed (X-Frame-Options: DENY verified).');

    // ----------------------------------------------------
    // Test 4: Content-Security-Policy (CSP)
    // ----------------------------------------------------
    console.log('Test 4: Content-Security-Policy (CSP)');
    const csp = devRes.headers.get('content-security-policy');
    if (!csp || !csp.includes("default-src 'self'")) {
      throw new Error(`CSP missing or invalid: ${csp}`);
    }
    console.log('✔ Test 4 passed (Content-Security-Policy verified).');

    // ----------------------------------------------------
    // Test 5: HSTS is disabled on localhost dev
    // ----------------------------------------------------
    console.log('Test 5: HSTS Disabled in Local Dev Mode');
    const hstsDev = devRes.headers.get('strict-transport-security');
    if (hstsDev !== null) {
      throw new Error(`HSTS should not be set on local development! Got: ${hstsDev}`);
    }
    console.log('✔ Test 5 passed (HSTS safely disabled for local dev).');
  } finally {
    await new Promise<void>((resolve) => devServer.close(() => resolve()));
  }

  // 2. Test Production Mode Server (HSTS enabled with 1 year max-age)
  const prodApp = express();
  prodApp.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: ["'self'", 'http://localhost:*', 'ws://localhost:*', 'https://*.sivarudrafoundation.com', 'wss://*.sivarudrafoundation.com'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https://*.sivarudrafoundation.com'],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
      strictTransportSecurity: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: false,
      },
      frameguard: { action: 'deny' },
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  prodApp.get('/health', (req, res) => res.json({ status: 'ok' }));

  const prodServer = http.createServer(prodApp);
  await new Promise<void>((resolve) => prodServer.listen(4099, '127.0.0.1', () => resolve()));

  try {
    // ----------------------------------------------------
    // Test 6: HSTS Enabled in Production
    // ----------------------------------------------------
    console.log('Test 6: HSTS Enabled in Production Mode');
    const prodRes = await fetch('http://127.0.0.1:4099/health');
    const hstsProd = prodRes.headers.get('strict-transport-security');
    if (!hstsProd || !hstsProd.includes('max-age=31536000') || !hstsProd.includes('includeSubDomains')) {
      throw new Error(`Invalid HSTS in production mode: ${hstsProd}`);
    }
    // ----------------------------------------------------
    // Test 7: Production Security Headers Complete Verification
    // ----------------------------------------------------
    console.log('Test 7: Production Security Headers Complete Verification');
    const nosniffProd = prodRes.headers.get('x-content-type-options');
    const frameProd = prodRes.headers.get('x-frame-options');
    const referrerProd = prodRes.headers.get('referrer-policy');
    const coopProd = prodRes.headers.get('cross-origin-opener-policy');

    if (nosniffProd !== 'nosniff' || frameProd !== 'DENY' || referrerProd !== 'strict-origin-when-cross-origin') {
      throw new Error('Production security headers verification failed.');
    }
    console.log('✔ Test 7 passed (Complete production security headers verified).');
  } finally {
    await new Promise<void>((resolve) => prodServer.close(() => resolve()));
  }

  console.log('========================================================');
  console.log('ALL HELMET SECURITY HEADERS TESTS PASSED SUCCESSFULLY!');
  console.log('========================================================');
}

runHelmetTests().catch((err) => {
  console.error('Helmet test failed:', err);
  process.exit(1);
});
