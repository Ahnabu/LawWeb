// Photo gallery: the admin routes (gallery.manage) and the public list, through
// real HTTP requests. Uploading to Cloudinary is not exercised (no credentials
// in tests); images are inserted directly, as the upload would leave them.
process.env.JWT_SECRET = 'gallery-test-jwt-secret-0123456789abcdef';
process.env.JWT_REFRESH_SECRET = 'gallery-test-refresh-secret-0123456789abcdef';
process.env.NODE_ENV = 'test';
// dotenv never overrides a set variable: no calls to the real Cloudinary account
process.env.CLOUDINARY_API_KEY = '';
process.env.CLOUDINARY_API_SECRET = '';

import { AddressInfo } from 'net';
import express from 'express';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import adminRoutes from '../../src/routes/admin';
import galleryRoutes from '../../src/routes/gallery';
import GalleryImage from '../../src/models/GalleryImage';
import AuditLog from '../../src/models/AuditLog';
import User from '../../src/models/User';
import Role from '../../src/models/Role';
import { generateAccessToken } from '../../src/utils/jwt';
import { sanitizeInput } from '../../src/middleware/security';

let failures = 0;
const expect = (name: string, cond: boolean, detail?: unknown) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) { failures++; if (detail !== undefined) console.log('      ', JSON.stringify(detail)); }
};

// In-memory by default; GALLERY_TEST_MONGODB_URI (a local *test* DB) as a fallback
const startDb = async () => {
  const uri = process.env.GALLERY_TEST_MONGODB_URI;
  if (uri) {
    if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/\w*test\w*$/.test(uri)) {
      console.error(`Refusing to run: ${uri} is not a local *test* database.`);
      process.exit(1);
    }
    return { uri, stop: async () => undefined };
  }
  const server = await MongoMemoryServer.create();
  return { uri: server.getUri('islam_associates_gallery_test'), stop: () => server.stop() };
};

const waitForAudit = async (action: string) => {
  for (let i = 0; i < 20; i++) {
    if (await AuditLog.exists({ action })) return true;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return false;
};

(async () => {
  const db = await startDb();
  await mongoose.connect(db.uri);
  await mongoose.connection.dropDatabase();

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(sanitizeInput);
  app.use('/api/admin', adminRoutes);
  app.use('/api/gallery', galleryRoutes);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const admin = await User.create({ name: 'Admin', email: 'admin@test.local', password: 'Passw0rd!x', role: 'admin', isVerified: true });
  const galleryRole = await Role.create({ name: 'Gallery keeper', nameKey: 'gallery keeper', permissions: ['gallery.manage'] });
  const keeper = await User.create({ name: 'Keeper', email: 'keeper@test.local', password: 'Passw0rd!x', role: 'staff', staffRoleId: galleryRole._id, isVerified: true });
  const token = (u: any) => generateAccessToken({ _id: u._id, role: u.role, tokenVersion: 0 });

  const send = async (who: any, method: string, url: string, body?: unknown) => {
    const res = await fetch(`${base}${url}`, {
      method,
      headers: { ...(who ? { cookie: `accessToken=${token(who)}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json: any;
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, json };
  };

  const img = (n: number, extra: Record<string, unknown> = {}) =>
    GalleryImage.create({ imageUrl: `https://res.example/lawweb/gallery/${n}.jpg`, sortOrder: n, ...extra });
  const a = await img(0, { isPublished: true, title: { en: 'Chamber', bn: 'চেম্বার' } });
  const b = await img(1, { isPublished: false });
  const c = await img(2, { isPublished: true, title: { en: 'Court', bn: '' } });

  // ── Public list ──────────────────────────────────────────────────────────
  let r = await send(null, 'GET', '/api/gallery');
  expect('public: published only, in order', r.status === 200 && r.json.data.map((i: any) => String(i._id)).join() === [a._id, c._id].join(), r.json);
  expect('public: no admin fields', r.json.data.every((i: any) => !('imagePublicId' in i) && !('isPublished' in i) && !('createdBy' in i)), r.json.data[0]);

  // ── Admin list ───────────────────────────────────────────────────────────
  r = await send(null, 'GET', '/api/admin/gallery');
  expect(`admin list: anonymous -> ${r.status}`, r.status === 401);
  r = await send(keeper, 'GET', '/api/admin/gallery');
  expect(`admin list: staff with gallery.manage -> ${r.status}`,
    r.status === 200 && r.json.data.length === 3 && r.json.meta.published === 2 && r.json.meta.hidden === 1, r.json);

  // ── Create without a file ────────────────────────────────────────────────
  r = await send(admin, 'POST', '/api/admin/gallery', { isPublished: true });
  expect(`create: no image -> ${r.status}`, r.status === 400 && r.json.message === 'No image uploaded', r.json);

  // ── Update ───────────────────────────────────────────────────────────────
  r = await send(keeper, 'PATCH', `/api/admin/gallery/${b._id}`, { title: { en: '  Library  ' }, description: { en: 'Our law library', bn: 'আমাদের আইন গ্রন্থাগার' } });
  expect(`update: text -> ${r.status}`,
    r.status === 200 && r.json.data.title.en === 'Library' && r.json.data.title.bn === '' && r.json.data.description.bn === '<p>আমাদের আইন গ্রন্থাগার</p>', r.json);
  r = await send(keeper, 'PATCH', `/api/admin/gallery/${a._id}`, { title: { bn: 'নতুন' } });
  expect('update: a language left out keeps its value', r.status === 200 && r.json.data.title.en === 'Chamber' && r.json.data.title.bn === 'নতুন', r.json);
  r = await send(keeper, 'PATCH', `/api/admin/gallery/${b._id}`, { isPublished: true });
  expect(`update: publish -> ${r.status}`, r.status === 200 && r.json.data.isPublished === true, r.json);
  expect('audit: publish logged', await waitForAudit('gallery.image_published'));
  expect('audit: text update logged', await waitForAudit('gallery.image_updated'));
  r = await send(keeper, 'PATCH', `/api/admin/gallery/${b._id}`, { title: { en: 'x'.repeat(121) } });
  expect(`update: title too long -> ${r.status}`, r.status === 400, r.json);
  r = await send(keeper, 'PATCH', `/api/admin/gallery/${b._id}`, {});
  expect(`update: empty body -> ${r.status}`, r.status === 400, r.json);
  r = await send(keeper, 'PATCH', `/api/admin/gallery/${b._id}`, { isPublished: 'yes' });
  expect(`update: non-boolean isPublished -> ${r.status}`, r.status === 400, r.json);
  r = await send(keeper, 'PATCH', '/api/admin/gallery/not-an-id', { isPublished: true });
  expect(`update: bad id -> ${r.status}`, r.status === 400, r.json);
  r = await send(keeper, 'PATCH', `/api/admin/gallery/${new mongoose.Types.ObjectId()}`, { isPublished: true });
  expect(`update: missing -> ${r.status}`, r.status === 404, r.json);
  r = await send(keeper, 'PATCH', `/api/admin/gallery/${b._id}`, { title: { $gt: '' } });
  expect(`update: operator keys stripped -> ${r.status}`, r.status === 200 && r.json.message === 'No changes', r.json);

  // ── Reorder ──────────────────────────────────────────────────────────────
  r = await send(keeper, 'PUT', '/api/admin/gallery/order', { order: [String(c._id), String(a._id)] });
  expect(`reorder: partial list, the rest follow -> ${r.status}`,
    r.status === 200 && r.json.data.map((d: any) => d._id).join() === [c._id, a._id, b._id].join(), r.json);
  r = await send(null, 'GET', '/api/gallery');
  expect('reorder: public order follows', r.json.data.map((i: any) => String(i._id)).join() === [c._id, a._id, b._id].join(), r.json);
  r = await send(keeper, 'PUT', '/api/admin/gallery/order', { order: [String(a._id), String(a._id)] });
  expect(`reorder: duplicates -> ${r.status}`, r.status === 400, r.json);
  r = await send(keeper, 'PUT', '/api/admin/gallery/order', { order: [String(new mongoose.Types.ObjectId())] });
  expect(`reorder: unknown id -> ${r.status}`, r.status === 400, r.json);
  r = await send(keeper, 'PUT', '/api/admin/gallery/order', { order: [] });
  expect(`reorder: empty -> ${r.status}`, r.status === 400, r.json);

  // ── Delete ───────────────────────────────────────────────────────────────
  r = await send(keeper, 'DELETE', `/api/admin/gallery/${c._id}`);
  expect(`delete -> ${r.status}`, r.status === 200 && !(await GalleryImage.exists({ _id: c._id })), r.json);
  expect('audit: delete logged', await waitForAudit('gallery.image_deleted'));
  r = await send(keeper, 'DELETE', `/api/admin/gallery/${c._id}`);
  expect(`delete again -> ${r.status}`, r.status === 404, r.json);

  // ── Hidden images stay out of the public list ────────────────────────────
  await send(admin, 'PATCH', `/api/admin/gallery/${a._id}`, { isPublished: false });
  await waitForAudit('gallery.image_hidden');
  r = await send(null, 'GET', '/api/gallery');
  expect('public: hiding removes it', r.json.data.length === 1 && String(r.json.data[0]._id) === String(b._id), r.json);

  server.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await db.stop();
  console.log(failures ? `\n${failures} FAILED` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
