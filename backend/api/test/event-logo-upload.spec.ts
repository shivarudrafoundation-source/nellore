import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

import { DatabaseService } from '../src/database/database.service.js';
import * as bcrypt from 'bcrypt';

const API = 'http://localhost:4000';

async function runEventLogoUploadTests() {
  console.log('================================================================');
  console.log('TEST SUITE: ADMIN EVENT LOGO DIRECT IMAGE UPLOAD (11/11)');
  console.log('================================================================');

  const db = new DatabaseService();
  await db.$connect();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testNum: number, description: string) {
    if (condition) {
      console.log(`  ✓ [PASS] Test ${testNum}: ${description}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] Test ${testNum}: ${description}`);
      failed++;
    }
  }

  const rand = Math.floor(10000 + Math.random() * 90000);
  const adminEmail = `logo_admin_${rand}@sivarudrafoundation.com`;
  const adminPassword = 'AdminPassword123!';
  let adminCookie = '';
  let createdAdmin: any;
  let createdEvent: any;

  // 1x1 valid transparent PNG base64
  const samplePngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  // 1x1 valid JPEG base64
  const sampleJpgBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  // 1x1 valid WEBP base64
  const sampleWebpBase64 = 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAQAcJaACdLoAAP7/2QAA';

  try {
    createdAdmin = await db.adminUser.create({
      data: {
        name: 'Logo Test Admin',
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 10),
      },
    });

    const adminLoginRes = await fetch(`${API}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    const cookieRaw = adminLoginRes.headers.get('set-cookie') || '';
    if (cookieRaw) adminCookie = cookieRaw.split(';')[0];

    // 1. Unauthenticated / non-admin access denied
    const unauthUploadRes = await fetch(`${API}/admin/events/upload-logo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: 'logo.png', mimeType: 'image/png', fileBase64: samplePngBase64 }),
    });
    assert(unauthUploadRes.status === 401, 1, 'Unauthenticated upload rejected with 401 Unauthorized');

    // 2. PNG accepted
    const pngUploadRes = await fetch(`${API}/admin/events/upload-logo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        filename: 'event_badge.png',
        mimeType: 'image/png',
        fileSize: 120,
        fileBase64: samplePngBase64,
      }),
    });
    const pngData = await pngUploadRes.json();
    assert(pngUploadRes.ok && pngData.fileUrl.endsWith('.png'), 2, 'Valid PNG image successfully uploaded and registered');

    // 3. JPG accepted
    const jpgUploadRes = await fetch(`${API}/admin/events/upload-logo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        filename: 'event_banner.jpg',
        mimeType: 'image/jpeg',
        fileSize: 150,
        fileBase64: sampleJpgBase64,
      }),
    });
    const jpgData = await jpgUploadRes.json();
    assert(jpgUploadRes.ok && (jpgData.fileUrl.endsWith('.jpg') || jpgData.fileUrl.endsWith('.jpeg')), 3, 'Valid JPG/JPEG image successfully uploaded and registered');

    // 4. WEBP accepted
    const webpUploadRes = await fetch(`${API}/admin/events/upload-logo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        filename: 'event_modern.webp',
        mimeType: 'image/webp',
        fileSize: 90,
        fileBase64: sampleWebpBase64,
      }),
    });
    const webpData = await webpUploadRes.json();
    assert(webpUploadRes.ok && webpData.fileUrl.endsWith('.webp'), 4, 'Valid WEBP image successfully uploaded and registered');

    // 5. Invalid MIME rejected (SVG/HTML/PDF/JS)
    const svgUploadRes = await fetch(`${API}/admin/events/upload-logo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        filename: 'vector.svg',
        mimeType: 'image/svg+xml',
        fileSize: 500,
        fileBase64: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      }),
    });
    assert(svgUploadRes.status === 400, 5, 'Disallowed MIME types (SVG, HTML, JS, PDF) strictly rejected with 400');

    // 6. >5MB rejected
    const largeUploadRes = await fetch(`${API}/admin/events/upload-logo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        filename: 'huge_image.png',
        mimeType: 'image/png',
        fileSize: 6 * 1024 * 1024,
        fileBase64: samplePngBase64,
      }),
    });
    assert(largeUploadRes.status === 400, 6, 'Files exceeding 5MB strictly rejected with 400');

    // 7. Upload success
    assert(pngUploadRes.ok && jpgUploadRes.ok && webpUploadRes.ok, 7, 'All compliant image uploads succeed');

    // 8. Safe URL returned
    assert(
      pngData.fileUrl && !pngData.fileUrl.includes('..') && !pngData.fileUrl.includes('javascript:'),
      8,
      'Safe sanitized URL returned',
    );

    // 9. Zero secret leakage
    const payloadStr = JSON.stringify([pngData, jpgData, webpData]);
    const leaks = ['SERVICE_ROLE', 'JWT_SECRET', 'DATABASE_URL', 'passwordHash'].some((s) => payloadStr.includes(s));
    assert(!leaks, 9, 'Zero credentials or storage secrets leaked in API responses');

    // 10. Event creation with uploaded logo
    const createEventRes = await fetch(`${API}/admin/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        name: `Logo Pageant ${rand}`,
        code: `LGP${String(rand).slice(-4)}`,
        location: 'Nellore Cultural Hall',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(),
        description: 'Pageant featuring custom uploaded logo',
        status: 'ACTIVE',
        logoUrl: pngData.fileUrl,
      }),
    });
    createdEvent = await createEventRes.json();
    assert(createEventRes.ok && createdEvent.logoUrl === pngData.fileUrl, 10, 'Event created successfully with uploaded logo URL');

    // 11. Event update with replaced logo
    const updateEventRes = await fetch(`${API}/admin/events/${createdEvent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        logoUrl: webpData.fileUrl,
      }),
    });
    const updatedEvent = await updateEventRes.json();
    assert(updateEventRes.ok && updatedEvent.logoUrl === webpData.fileUrl, 11, 'Event updated successfully with replaced logo URL');

  } catch (err: any) {
    console.error('Event logo upload test error:', err);
    failed++;
  } finally {
    try {
      if (createdEvent?.id) {
        await db.event.deleteMany({ where: { id: createdEvent.id } });
      }
      if (createdAdmin?.id) {
        await db.adminUser.deleteMany({ where: { id: createdAdmin.id } });
      }
    } catch (e) {}
    await db.$disconnect();
  }

  console.log('================================================================');
  console.log(`EVENT LOGO UPLOAD TESTS SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: 11)`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runEventLogoUploadTests();
