// Authorization matrix: every row is a real HTTP request through
// authenticateToken, the route gates and the controllers.
// Phase 1 (characterization): statuses and key body facts are asserted inline;
// every error response's { status, message, code } is also compared to
// endpoints.baseline.json, recorded from the code before the policy refactor.
// UPDATE_BASELINE=1 re-records it. Phase 2 adds staff with firm roles.
process.env.JWT_SECRET = 'access-test-jwt-secret-0123456789abcdef';
process.env.JWT_REFRESH_SECRET = 'access-test-refresh-secret-0123456789abcdef';
process.env.NODE_ENV = 'test';
// dotenv never overrides a set variable: no real email from staff setup links
process.env.RESEND_API_KEY = '';

import fs from 'fs';
import path from 'path';
import { AddressInfo } from 'net';
import express from 'express';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import caseRoutes from '../../src/routes/cases';
import consultationRoutes from '../../src/routes/consultations';
import lawyerRoutes from '../../src/routes/lawyers';
import adminRoutes from '../../src/routes/admin';
import blogRoutes from '../../src/routes/blogs';
import accessRoutes from '../../src/routes/access';
import User from '../../src/models/User';
import Role from '../../src/models/Role';
import ContentPage from '../../src/models/ContentPage';
import { ROLE_TEMPLATES } from '../../src/access/roleTemplates';
import { loadAccess } from '../../src/access/loadAccess';
import Case from '../../src/models/Case';
import Consultation from '../../src/models/Consultation';
import { generateAccessToken } from '../../src/utils/jwt';
import { DAY_KEYS, defaultSchedule } from '../../src/utils/schedule';

const BASELINE_FILE = path.join(__dirname, 'endpoints.baseline.json');
const ACTORS = ['admin', 'lawyerA', 'lawyerB', 'clientA', 'clientB'] as const;
type Actor = (typeof ACTORS)[number];

let failures = 0;
const expect = (name: string, cond: boolean, detail?: unknown) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) { failures++; if (detail !== undefined) console.log('      ', JSON.stringify(detail)); }
};

// Local test database: in-memory by default; ACCESS_TEST_MONGODB_URI as a fallback
// when the mongod binary can't be downloaded. It is dropped, so only *test* DBs.
const startDb = async () => {
  const uri = process.env.ACCESS_TEST_MONGODB_URI;
  if (uri) {
    if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/\w*test\w*$/.test(uri)) {
      console.error(`Refusing to run: ${uri} is not a local *test* database.`);
      process.exit(1);
    }
    return { uri, stop: async () => undefined };
  }
  const server = await MongoMemoryServer.create();
  return { uri: server.getUri('lawweb_access_test'), stop: () => server.stop() };
};

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/consultations', consultationRoutes);
  app.use('/api/lawyers', lawyerRoutes);
  app.use('/api/cases', caseRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/blogs', blogRoutes);
  app.use('/api/access', accessRoutes);
  return app;
};

// First weekday at least `offset` days ahead, as YYYY-MM-DD (default schedule: Mon-Fri)
const futureWeekday = (offset: number) => {
  const schedule = defaultSchedule();
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  while (!schedule[DAY_KEYS[d.getUTCDay()]].isAvailable) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

(async () => {
  const db = await startDb();
  await mongoose.connect(db.uri);
  await mongoose.connection.dropDatabase();
  await Promise.all([Case.syncIndexes(), Consultation.syncIndexes(), User.syncIndexes(), Role.syncIndexes()]);

  const mkUser = (name: string, role: 'admin' | 'lawyer' | 'client') =>
    User.create({ name, email: `${name.toLowerCase()}@test.local`, password: 'Passw0rd!x', role, isVerified: true });
  const users: Record<Actor, any> = {
    admin: await mkUser('Admin', 'admin'),
    lawyerA: await mkUser('LawyerA', 'lawyer'),
    lawyerB: await mkUser('LawyerB', 'lawyer'),
    clientA: await mkUser('ClientA', 'client'),
    clientB: await mkUser('ClientB', 'client'),
  };
  const tokens = Object.fromEntries(
    ACTORS.map((a) => [a, generateAccessToken({ _id: users[a]._id, role: users[a].role, tokenVersion: 0 })])
  ) as Record<Actor, string>;

  const newCase = async (extra: Record<string, unknown> = {}) =>
    Case.create({
      clientId: users.clientA._id,
      clientEmail: 'clienta@test.local',
      clientName: 'ClientA',
      lawyerId: users.lawyerA._id,
      type: 'civil',
      title: 'Original title',
      description: '<p>Desc</p>',
      caseValue: 50000,
      retainerAmount: 10000,
      totalPayment: 2000,
      payments: [{ amount: 2000, details: 'first' }],
      internalNotes: 'secret note',
      evidenceSummary: 'evidence',
      witnessNames: ['W1'],
      ...extra,
    });
  const archivedByLawyerA = () =>
    newCase({ isArchived: true, archivedAt: new Date(), archivedBy: users.lawyerA._id, archiveReason: 'manual' });

  let dayOffset = 30;
  const newConsultation = () => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() + dayOffset++);
    return Consultation.create({
      clientId: users.clientA._id,
      lawyerId: users.lawyerA._id,
      consultationType: 'initial-consultation',
      date: d,
      time: '10:00 AM',
      subject: 'Subject',
      description: 'Description',
    });
  };

  const CA = await newCase();
  await newConsultation();

  const server = buildApp().listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const send = async (token: string, method: string, url: string, body?: unknown) => {
    const res = await fetch(`${base}${url}`, {
      method,
      headers: { cookie: `accessToken=${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json: any;
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, json };
  };
  const request = (actor: Actor, method: string, url: string, body?: unknown) => send(tokens[actor], method, url, body);

  const recorded: Record<string, unknown> = {};
  const baseline: Record<string, any> | null =
    !process.env.UPDATE_BASELINE && fs.existsSync(BASELINE_FILE) ? JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')) : null;

  // One matrix cell: expected status (a list where either is fine), optional body check
  type Cell = number | number[] | null;
  const row = async (
    label: string,
    expected: Record<Actor, Cell>,
    run: (actor: Actor) => Promise<{ status: number; json: any }>,
    check?: Partial<Record<Actor, (json: any) => boolean>>
  ) => {
    for (const actor of ACTORS) {
      const want = expected[actor];
      if (want === null) continue;
      const { status, json } = await run(actor);
      const ok = Array.isArray(want) ? want.includes(status) : status === want;
      const bodyOk = !check?.[actor] || (status < 300 && check[actor]!(json));
      const key = `${label} :: ${actor}`;
      expect(`${key} -> ${status}`, ok && bodyOk, ok ? { body: json } : { want, got: status, body: json });

      // Error bodies are part of the contract the frontend relies on
      const snapshot = status >= 300
        ? { status, message: json?.message, ...(json?.code ? { code: json.code } : {}) }
        : { status };
      recorded[key] = snapshot;
      if (baseline) {
        const same = JSON.stringify(baseline[key]) === JSON.stringify(snapshot);
        expect(`${key} matches baseline`, same, { baseline: baseline[key], now: snapshot });
      }
    }
  };

  const id = (v: any) => String(v?._id ?? v);
  const A = id(users.lawyerA._id);
  const B = id(users.lawyerB._id);
  const caUrl = `/api/cases/${CA._id}`;

  // ── Reads against the base fixtures ────────────────────────────────────────
  await row('GET /api/cases/my-cases',
    { admin: 200, lawyerA: 200, lawyerB: 200, clientA: 200, clientB: 200 },
    (a) => request(a, 'GET', '/api/cases/my-cases'),
    {
      admin: (j) => j.data.some((c: any) => id(c) === id(CA) && c.lawyerId?.name === 'LawyerA' && c.clientId?.name === 'ClientA' && c.internalNotes),
      lawyerA: (j) => j.data.length === 1 && typeof j.data[0].lawyerId === 'string' && j.data[0].clientId?.name === 'ClientA' && j.data[0].payments.length === 1 && j.meta.counts.active === 1,
      lawyerB: (j) => j.data.length === 0 && j.meta.counts.active === 0,
      clientA: (j) => j.data.length === 1 && j.data[0].internalNotes === undefined && j.data[0].lawyerId?.name === 'LawyerA' && !j.meta,
      clientB: (j) => j.data.length === 0,
    });

  await row('GET /api/cases/:CA',
    { admin: 200, lawyerA: 200, lawyerB: 403, clientA: 200, clientB: 403 },
    (a) => request(a, 'GET', caUrl),
    {
      admin: (j) => j.data.internalNotes === 'secret note' && j.data.payments.length === 1,
      lawyerA: (j) => j.data.internalNotes === 'secret note' && j.data.payments.length === 1 && j.data.caseValue === 50000 && j.data.evidenceSummary === 'evidence',
      clientA: (j) => j.data.internalNotes === undefined && j.data.archivedBy === undefined && j.data.caseValue === 50000,
    });

  await row('GET /api/cases/:missing',
    { admin: 404, lawyerA: 404, lawyerB: 404, clientA: 404, clientB: 404 },
    (a) => request(a, 'GET', `/api/cases/${new mongoose.Types.ObjectId()}`));

  await row('GET /api/consultations/my-consultations',
    { admin: 403, lawyerA: 200, lawyerB: 200, clientA: 200, clientB: 200 },
    (a) => request(a, 'GET', '/api/consultations/my-consultations'),
    {
      lawyerA: (j) => j.consultations.length === 1 && j.consultations[0].clientId?.name === 'ClientA',
      lawyerB: (j) => j.consultations.length === 0,
      clientA: (j) => j.consultations.length === 1 && j.consultations[0].lawyerId?.name === 'LawyerA',
      clientB: (j) => j.consultations.length === 0,
    });

  await row('GET /api/consultations/notifications',
    { admin: 200, lawyerA: 200, lawyerB: 200, clientA: 200, clientB: 200 },
    (a) => request(a, 'GET', '/api/consultations/notifications'),
    {
      admin: (j) => j.notifications.length === 1,
      lawyerA: (j) => j.notifications.filter((n: any) => n.type === 'appointment').length === 1 && j.notifications.filter((n: any) => n.type === 'case').length === 1,
      lawyerB: (j) => j.notifications.length === 0,
      clientA: (j) => j.notifications.length === 2,
      clientB: (j) => j.notifications.length === 0,
    });

  await row('GET /api/lawyers/me/availability',
    { admin: 403, lawyerA: 200, lawyerB: 200, clientA: 403, clientB: 403 },
    (a) => request(a, 'GET', '/api/lawyers/me/availability'),
    { lawyerA: (j) => id(j.data.lawyerId) === A, lawyerB: (j) => id(j.data.lawyerId) === B });

  await row('PUT /api/lawyers/me/availability',
    { admin: 403, lawyerA: 200, lawyerB: null, clientA: 403, clientB: 403 },
    (a) => request(a, 'PUT', '/api/lawyers/me/availability', { isAcceptingNewClients: true }),
    { lawyerA: (j) => id(j.data.lawyerId) === A && j.data.isAcceptingNewClients === true });

  await row('GET /api/lawyers/me/profile',
    { admin: 403, lawyerA: 200, lawyerB: null, clientA: 403, clientB: 403 },
    (a) => request(a, 'GET', '/api/lawyers/me/profile'),
    { lawyerA: (j) => id(j.data.userId) === A && j.data.firstName === 'LawyerA' });

  await row('PUT /api/lawyers/me/profile',
    { admin: 403, lawyerA: 200, lawyerB: null, clientA: 403, clientB: 403 },
    (a) => request(a, 'PUT', '/api/lawyers/me/profile', { designation: { en: 'Advocate', bn: '' } }),
    { lawyerA: (j) => id(j.data.userId) === A && j.data.designation?.en === 'Advocate' });

  await row('GET /api/admin/stats',
    { admin: 200, lawyerA: 403, lawyerB: 403, clientA: 403, clientB: 403 },
    (a) => request(a, 'GET', '/api/admin/stats'));

  await row('GET /api/blogs/admin/all',
    { admin: 200, lawyerA: 403, lawyerB: 403, clientA: 403, clientB: 403 },
    (a) => request(a, 'GET', '/api/blogs/admin/all'));

  await row('GET /api/blogs (public, signed-in)',
    { admin: 200, lawyerA: 200, lawyerB: null, clientA: 200, clientB: null },
    (a) => request(a, 'GET', '/api/blogs'));

  // ── Writes: each cell gets its own fresh record ────────────────────────────
  await row('PATCH /api/cases/:CA {status}',
    { admin: 200, lawyerA: 200, lawyerB: 403, clientA: 403, clientB: 403 },
    async (a) => request(a, 'PATCH', `/api/cases/${(await newCase())._id}`, { status: 'filed' }),
    { admin: (j) => j.data.status === 'filed', lawyerA: (j) => j.data.status === 'filed' });

  await row('PATCH /api/cases/:CA {title, description}',
    { admin: 200, lawyerA: 200, lawyerB: null, clientA: null, clientB: null },
    async (a) => request(a, 'PATCH', `/api/cases/${(await newCase())._id}`, { title: 'New title', description: '<p>New</p>' }),
    {
      admin: (j) => j.data.title === 'New title' && j.data.description === '<p>New</p>',
      // Quirk kept on purpose: lawyers' title/description edits are silently ignored
      lawyerA: (j) => j.data.title === 'Original title' && j.data.description === '<p>Desc</p>',
    });

  await row('PATCH /api/cases/:CA {finance + confidential}',
    { admin: 200, lawyerA: 200, lawyerB: 403, clientA: null, clientB: null },
    async (a) => request(a, 'PATCH', `/api/cases/${(await newCase())._id}`, { caseValue: 1, internalNotes: 'changed', paymentEntry: { amount: 5 } }),
    { lawyerA: (j) => j.data.caseValue === 1 && j.data.internalNotes === 'changed' && j.data.payments.length === 2 });

  await row('PATCH /api/cases/:CA {deletePaymentId}',
    { admin: 200, lawyerA: 403, lawyerB: 403, clientA: 403, clientB: 403 },
    async (a) => {
      const c = await newCase();
      return request(a, 'PATCH', `/api/cases/${c._id}`, { deletePaymentId: String(c.payments[0]._id) });
    },
    { admin: (j) => j.data.payments.length === 0 });

  await row('PATCH /api/cases/:archived {status}',
    { admin: 409, lawyerA: 409, lawyerB: 403, clientA: null, clientB: null },
    async (a) => request(a, 'PATCH', `/api/cases/${(await archivedByLawyerA())._id}`, { status: 'filed' }));

  await row('POST /api/cases (for lawyerA)',
    { admin: 201, lawyerA: 201, lawyerB: 201, clientA: 403, clientB: 403 },
    (a) => request(a, 'POST', '/api/cases', {
      lawyerId: A, clientEmail: 'new@test.local', clientName: 'New', type: 'civil', title: 'T', description: 'D',
    }),
    {
      admin: (j) => id(j.data.lawyerId) === A,
      lawyerA: (j) => id(j.data.lawyerId) === A,
      lawyerB: (j) => id(j.data.lawyerId) === B, // forced to self
    });

  await row('POST /api/cases (admin, client account as lawyerId)',
    { admin: 404, lawyerA: null, lawyerB: null, clientA: null, clientB: null },
    (a) => request(a, 'POST', '/api/cases', {
      lawyerId: id(users.clientA._id), clientEmail: 'new@test.local', clientName: 'New', type: 'civil', title: 'T', description: 'D',
    }));

  await row('PATCH /api/cases/:CA/toggle-featured',
    { admin: 200, lawyerA: 200, lawyerB: 403, clientA: 403, clientB: 403 },
    async (a) => request(a, 'PATCH', `/api/cases/${(await newCase())._id}/toggle-featured`),
    { admin: (j) => j.data.isFeatured === true, lawyerA: (j) => j.data.isFeatured === true });

  await row('PATCH /api/cases/:CA/archive',
    { admin: 403, lawyerA: 200, lawyerB: 403, clientA: 403, clientB: 403 },
    async (a) => request(a, 'PATCH', `/api/cases/${(await newCase())._id}/archive`, { note: 'done' }),
    { lawyerA: (j) => j.data.isArchived === true && j.data.archivedBy?.name === 'LawyerA' });

  await row('PATCH /api/cases/:CA/restore (archived by lawyerA)',
    { admin: 403, lawyerA: 200, lawyerB: 403, clientA: 403, clientB: 403 },
    async (a) => request(a, 'PATCH', `/api/cases/${(await archivedByLawyerA())._id}/restore`),
    { lawyerA: (j) => j.data.isArchived === false });

  await row('PATCH /api/cases/:CA/restore (archived by admin)',
    { admin: null, lawyerA: 403, lawyerB: 403, clientA: null, clientB: null },
    async (a) => request(a, 'PATCH', `/api/cases/${(await newCase({
      isArchived: true, archivedAt: new Date(), archivedBy: users.admin._id, archiveReason: 'manual',
    }))._id}/restore`));

  await row('DELETE /api/cases/:CA (archived)',
    { admin: 200, lawyerA: 403, lawyerB: 403, clientA: 403, clientB: 403 },
    async (a) => request(a, 'DELETE', `/api/cases/${(await archivedByLawyerA())._id}`));

  await row('PUT /api/consultations/:id/confirm',
    { admin: 403, lawyerA: 200, lawyerB: 403, clientA: 403, clientB: 403 },
    async (a) => request(a, 'PUT', `/api/consultations/${(await newConsultation())._id}/confirm`),
    { lawyerA: (j) => j.consultation.lawyerConfirmed === true });

  await row('POST /api/consultations/:id/cancel',
    { admin: 403, lawyerA: 200, lawyerB: 403, clientA: 200, clientB: 403 },
    async (a) => request(a, 'POST', `/api/consultations/${(await newConsultation())._id}/cancel`),
    { lawyerA: (j) => j.consultation.status === 'cancelled', clientA: (j) => j.consultation.status === 'cancelled' });

  await row('PUT /api/consultations/:id/status {cancelled}',
    { admin: 403, lawyerA: 200, lawyerB: 403, clientA: 403, clientB: 403 },
    async (a) => request(a, 'PUT', `/api/consultations/${(await newConsultation())._id}/status`, { status: 'cancelled' }),
    { lawyerA: (j) => j.consultation.status === 'cancelled' });

  await row('PUT /api/consultations/:id/status {completed, future}',
    { admin: null, lawyerA: 400, lawyerB: 403, clientA: null, clientB: null },
    async (a) => request(a, 'PUT', `/api/consultations/${(await newConsultation())._id}/status`, { status: 'completed' }));

  let bookingTime = 9;
  await row('POST /api/consultations/book',
    { admin: 403, lawyerA: 403, lawyerB: 403, clientA: 201, clientB: 201 },
    (a) => request(a, 'POST', '/api/consultations/book', {
      lawyerId: B, consultationType: 'initial-consultation', date: futureWeekday(3),
      time: `${String(bookingTime++).padStart(2, '0')}:00`, subject: 'Help', description: 'Need help',
    }));

  // ══ Phase 2: staff with firm roles ══════════════════════════════════════════
  const templatePerms = (name: string) => [...ROLE_TEMPLATES.find((t) => t.name === name)!.permissions];
  const mkRole = (name: string, permissions: string[]) => Role.create({ name, nameKey: name.toLowerCase(), permissions });
  const roles = {
    editor: await mkRole('Content Editor', templatePerms('Content Editor')),
    reception: await mkRole('Receptionist', templatePerms('Receptionist')),
    accountant: await mkRole('Accountant', templatePerms('Accountant')),
    manager: await mkRole('Office Manager', templatePerms('Office Manager')),
  };
  const mkStaff = (name: string, staffRoleId: unknown, extra: Record<string, unknown> = {}) =>
    User.create({ name, email: `${name.toLowerCase()}@test.local`, password: 'Passw0rd!x', role: 'staff', staffRoleId, isVerified: true, ...extra });
  const staffUsers = {
    superAdmin: users.admin,
    staffEditor: await mkStaff('StaffEditor', roles.editor._id),
    staffReception: await mkStaff('StaffReception', roles.reception._id),
    staffAccountant: await mkStaff('StaffAccountant', roles.accountant._id),
    staffNone: await mkStaff('StaffNone', null),
    staffManager: await mkStaff('StaffManager', roles.manager._id),
    staffBlocked: await mkStaff('StaffBlocked', roles.reception._id, { isBlocked: true }),
  };
  type StaffActor = keyof typeof staffUsers;
  const staffTokens = Object.fromEntries(
    Object.entries(staffUsers).map(([k, u]) => [k, generateAccessToken({ _id: u._id, role: u.role, tokenVersion: 0 })])
  ) as Record<StaffActor, string>;
  const as = (actor: StaffActor, method: string, url: string, body?: unknown) => send(staffTokens[actor], method, url, body);

  // The profile payload shows the role's name on the staff account page
  const editorAccess = await loadAccess(staffUsers.staffEditor);
  const noRoleAccess = await loadAccess(staffUsers.staffNone);
  expect('P2 loadAccess: staff role name for the profile',
    editorAccess.firmRoleName === 'Content Editor' && noRoleAccess.firmRoleName === null &&
    (await loadAccess(users.admin)).firmRoleName === undefined);

  const STAFF_MATRIX = ['superAdmin', 'staffEditor', 'staffReception', 'staffAccountant', 'staffNone'] as const;
  type StaffCell = number | null;
  const staffRow = async (
    label: string,
    expected: Record<(typeof STAFF_MATRIX)[number], StaffCell>,
    run: (actor: StaffActor) => Promise<{ status: number; json: any }>,
    check?: Partial<Record<StaffActor, (json: any) => boolean>>
  ) => {
    for (const actor of STAFF_MATRIX) {
      const want = expected[actor];
      if (want === null) continue;
      const { status, json } = await run(actor);
      const bodyOk = !check?.[actor] || check[actor]!(json);
      expect(`P2 ${label} :: ${actor} -> ${status}`, status === want && bodyOk, { want, got: status, body: json });
    }
  };

  await staffRow('GET /api/admin/stats', { superAdmin: 200, staffEditor: 403, staffReception: 403, staffAccountant: 403, staffNone: 403 },
    (a) => as(a, 'GET', '/api/admin/stats'),
    { superAdmin: (j) => typeof j.data.totalCases === 'number' && typeof j.data.totalClients === 'number' });

  await staffRow('GET /api/admin/blogs', { superAdmin: 200, staffEditor: 200, staffReception: 403, staffAccountant: 403, staffNone: 403 },
    (a) => as(a, 'GET', '/api/admin/blogs'));
  await staffRow('GET /api/blogs/admin/all', { superAdmin: 200, staffEditor: 200, staffReception: 403, staffAccountant: 403, staffNone: 403 },
    (a) => as(a, 'GET', '/api/blogs/admin/all'));

  const seedDraft = () => ContentPage.updateOne(
    { key: 'about' },
    { $set: { draft: { strings: { 'about.heroTitle': { en: 'Draft', bn: 'Draft' } } }, hasUnpublishedChanges: true } },
    { upsert: true }
  );
  await staffRow('POST /api/admin/content/:key/publish', { superAdmin: 200, staffEditor: 200, staffReception: 403, staffAccountant: 403, staffNone: 403 },
    async (a) => { await seedDraft(); return as(a, 'POST', '/api/admin/content/about/publish'); });
  await staffRow('GET /api/admin/content (content.edit implied by publish)', { superAdmin: 200, staffEditor: 200, staffReception: 403, staffAccountant: 403, staffNone: 403 },
    (a) => as(a, 'GET', '/api/admin/content'));

  await staffRow('GET /api/admin/consultations', { superAdmin: 200, staffEditor: 403, staffReception: 200, staffAccountant: 403, staffNone: 403 },
    (a) => as(a, 'GET', '/api/admin/consultations'));
  await staffRow('PATCH /api/admin/consultations/:id/status', { superAdmin: 200, staffEditor: 403, staffReception: 200, staffAccountant: 403, staffNone: 403 },
    async (a) => as(a, 'PATCH', `/api/admin/consultations/${(await newConsultation())._id}/status`, { status: 'cancelled' }));

  await staffRow('GET /api/admin/cases', { superAdmin: 200, staffEditor: 403, staffReception: 200, staffAccountant: 200, staffNone: 403 },
    (a) => as(a, 'GET', '/api/admin/cases?archived=all&limit=100'),
    {
      superAdmin: (j) => j.data.some((c: any) => c.payments && c.internalNotes),
      staffReception: (j) => j.data.length > 0 && j.data.every((c: any) => !('payments' in c) && !('internalNotes' in c) && !('caseValue' in c)),
      staffAccountant: (j) => j.data.length > 0 && j.data.every((c: any) => 'payments' in c && !('internalNotes' in c) && !('evidenceSummary' in c)),
    });

  await staffRow('PATCH /api/admin/cases/:id {paymentEntry}', { superAdmin: 200, staffEditor: 403, staffReception: 403, staffAccountant: 200, staffNone: 403 },
    async (a) => as(a, 'PATCH', `/api/admin/cases/${(await newCase())._id}`, { paymentEntry: { amount: 5 } }));
  // The admin cases page records payments through /api/cases/:id
  await staffRow('PATCH /api/cases/:id {paymentEntry} (admin page)', { superAdmin: 200, staffEditor: 403, staffReception: 403, staffAccountant: 200, staffNone: 403 },
    async (a) => as(a, 'PATCH', `/api/cases/${(await newCase())._id}`, { paymentEntry: { amount: 5 } }),
    { staffAccountant: (j) => j.data.payments.length === 2 });
  await staffRow('PATCH /api/cases/:id {deletePaymentId} stays super-admin only', { superAdmin: 200, staffEditor: 403, staffReception: 403, staffAccountant: 403, staffNone: 403 },
    async (a) => { const c = await newCase(); return as(a, 'PATCH', `/api/cases/${c._id}`, { deletePaymentId: String(c.payments[0]._id) }); });

  const isFieldForbidden = (field: string) => (j: any) => j.code === 'FIELD_FORBIDDEN' && j.fields?.includes(field);
  await staffRow('PATCH /api/admin/cases/:id {status: changed}', { superAdmin: 200, staffEditor: 403, staffReception: 403, staffAccountant: 403, staffNone: 403 },
    async (a) => as(a, 'PATCH', `/api/admin/cases/${(await newCase())._id}`, { status: 'filed' }),
    { staffAccountant: isFieldForbidden('status') });
  await staffRow('PATCH /api/admin/cases/:id {internalNotes: changed}', { superAdmin: 200, staffEditor: 403, staffReception: 403, staffAccountant: 403, staffNone: 403 },
    async (a) => as(a, 'PATCH', `/api/admin/cases/${(await newCase())._id}`, { internalNotes: 'changed' }),
    { staffAccountant: isFieldForbidden('internalNotes') });
  await staffRow('PATCH /api/admin/cases/:id {status: unchanged, caseValue} (accountant)', { superAdmin: null, staffEditor: null, staffReception: null, staffAccountant: 200, staffNone: null },
    async (a) => as(a, 'PATCH', `/api/admin/cases/${(await newCase())._id}`, { status: 'active', caseValue: 7 }),
    { staffAccountant: (j) => j.data.caseValue === 7 && !('internalNotes' in j.data) });

  await staffRow('GET /api/admin/users', { superAdmin: 200, staffEditor: 403, staffReception: 403, staffAccountant: 403, staffNone: 403 },
    (a) => as(a, 'GET', '/api/admin/users'));
  await staffRow('GET /api/admin/roles', { superAdmin: 200, staffEditor: 403, staffReception: 403, staffAccountant: 403, staffNone: 403 },
    (a) => as(a, 'GET', '/api/admin/roles'),
    { superAdmin: (j) => j.data.find((r: any) => r.name === 'Receptionist')?.staffCount === 2 });
  let roleSeq = 0;
  await staffRow('POST /api/admin/roles', { superAdmin: 201, staffEditor: 403, staffReception: 403, staffAccountant: 403, staffNone: 403 },
    (a) => as(a, 'POST', '/api/admin/roles', { name: `Temp role ${roleSeq++}`, permissions: ['audit.view'] }));
  await staffRow('GET /api/admin/staff', { superAdmin: 200, staffEditor: 403, staffReception: 403, staffAccountant: 403, staffNone: 403 },
    (a) => as(a, 'GET', '/api/admin/staff'),
    { superAdmin: (j) => j.meta.counts.all === 6 && j.meta.counts.blocked === 1 && j.data.some((s: any) => s.staffRoleId?.name === 'Accountant') });
  let staffSeq = 0;
  await staffRow('POST /api/admin/staff', { superAdmin: 201, staffEditor: 403, staffReception: 403, staffAccountant: 403, staffNone: 403 },
    (a) => as(a, 'POST', '/api/admin/staff', { name: 'New Staff', email: `newstaff${staffSeq++}@test.local`, staffRoleId: String(roles.editor._id) }),
    { superAdmin: (j) => j.data.role === 'staff' && j.data.staffRoleId?.name === 'Content Editor' });

  await staffRow('GET /api/access/catalog', { superAdmin: 200, staffEditor: 200, staffReception: 200, staffAccountant: 200, staffNone: 200 },
    (a) => as(a, 'GET', '/api/access/catalog'),
    { staffNone: (j) => j.data.permissions.length === 24 && j.data.templates.length === 4 && j.data.delegable.includes('cases.view') && !j.data.delegable.includes('audit.view') });
  const catalogClient = await request('clientA', 'GET', '/api/access/catalog');
  expect(`P2 GET /api/access/catalog :: client -> ${catalogClient.status}`, catalogClient.status === 403);
  const catalogLawyer = await request('lawyerA', 'GET', '/api/access/catalog');
  expect(`P2 GET /api/access/catalog :: lawyer -> ${catalogLawyer.status}`, catalogLawyer.status === 200);

  await staffRow('GET /api/cases/my-cases (no staff workspace before Phase 3)', { superAdmin: null, staffEditor: 403, staffReception: 403, staffAccountant: 403, staffNone: 403 },
    (a) => as(a, 'GET', '/api/cases/my-cases'));
  await staffRow('GET /api/consultations/my-consultations', { superAdmin: null, staffEditor: 403, staffReception: 403, staffAccountant: 403, staffNone: 403 },
    (a) => as(a, 'GET', '/api/consultations/my-consultations'));
  await staffRow('GET /api/consultations/notifications', { superAdmin: 200, staffEditor: 200, staffReception: 200, staffAccountant: 200, staffNone: 200 },
    (a) => as(a, 'GET', '/api/consultations/notifications'),
    { staffReception: (j) => j.notifications.length > 0, staffEditor: (j) => j.notifications.length === 0, staffNone: (j) => j.notifications.length === 0 });

  for (const url of ['/api/admin/consultations', '/api/access/catalog', '/api/admin/stats']) {
    const r = await as('staffBlocked', 'GET', url);
    expect(`P2 GET ${url} :: staffBlocked -> ${r.status} ${r.json?.code}`, r.status === 403 && r.json?.code === 'ACCOUNT_BLOCKED');
  }

  // ── Office Manager: reassigning cases, and whose accounts they may touch ────
  let r = await as('staffManager', 'PATCH', `/api/admin/cases/${(await newCase())._id}`, { lawyerId: B });
  expect(`P2 manager PATCH case {lawyerId} without cases.assign -> ${r.status}`, r.status === 403 && r.json.code === 'FIELD_FORBIDDEN', r.json);
  await Role.updateOne({ _id: roles.manager._id }, { $push: { permissions: 'cases.assign' } });
  r = await as('staffManager', 'PATCH', `/api/admin/cases/${(await newCase())._id}`, { lawyerId: B });
  expect(`P2 manager PATCH case {lawyerId} with cases.assign -> ${r.status}`, r.status === 200 && id(r.json.data.lawyerId) === B, r.json);
  r = await as('staffManager', 'PATCH', `/api/admin/users/${staffUsers.staffNone._id}/block`, {});
  expect(`P2 manager block a staff account -> ${r.status}`, r.status === 403);
  r = await as('staffManager', 'PATCH', `/api/admin/users/${users.lawyerB._id}/block`, {});
  expect(`P2 manager block a lawyer (no lawyers.manage) -> ${r.status}`, r.status === 403);
  r = await as('staffManager', 'GET', `/api/admin/users/${staffUsers.staffNone._id}`);
  expect(`P2 manager view a staff account -> ${r.status}`, r.status === 404);
  r = await as('staffManager', 'GET', `/api/admin/users/${users.lawyerB._id}`);
  expect(`P2 manager view a lawyer (lawyers.view) -> ${r.status}`, r.status === 200);
  const victim = await User.create({ name: 'Victim', email: 'victim@test.local', password: 'Passw0rd!x', role: 'client', isVerified: true });
  r = await as('staffManager', 'PATCH', `/api/admin/users/${victim._id}/block`, {});
  expect(`P2 manager block a client -> ${r.status}`, r.status === 200 && r.json.data.isBlocked === true);
  r = await as('staffManager', 'GET', '/api/admin/stats');
  expect(`P2 manager stats: only permitted keys -> ${r.status}`,
    r.status === 200 && 'totalCases' in r.json.data && 'todayConsultations' in r.json.data && 'totalLawyers' in r.json.data && 'unreadMessages' in r.json.data && 'totalClients' in r.json.data, r.json);
  r = await as('staffAccountant', 'PATCH', `/api/admin/cases/${(await newCase({ isArchived: true, archivedAt: new Date(), archiveReason: 'lawyer-deleted' }))._id}/restore`);
  expect(`P2 accountant restore (no cases.archive) -> ${r.status}`, r.status === 403);

  // ── Revocation applies on the next request, same token ─────────────────────
  r = await as('staffReception', 'GET', '/api/admin/consultations');
  expect(`P2 revocation: before -> ${r.status}`, r.status === 200);
  await Role.updateOne({ _id: roles.reception._id }, { $set: { permissions: ['cases.view', 'messages.manage'] } });
  r = await as('staffReception', 'GET', '/api/admin/consultations');
  expect(`P2 revocation: same token after removing appointments.* -> ${r.status}`, r.status === 403);
  await Role.updateOne({ _id: roles.reception._id }, { $set: { permissions: templatePerms('Receptionist') } });

  // ── Roles API ──────────────────────────────────────────────────────────────
  r = await as('superAdmin', 'POST', '/api/admin/roles', { name: 'receptionist', permissions: ['cases.view'] });
  expect(`P2 roles: duplicate name (case-insensitive) -> ${r.status}`, r.status === 409);
  r = await as('superAdmin', 'POST', '/api/admin/roles', { name: 'Bad', permissions: ['cases.view', 'roles.manage'] });
  expect(`P2 roles: unknown permission -> ${r.status}`, r.status === 400 && r.json.unknown?.[0] === 'roles.manage');
  r = await as('superAdmin', 'POST', '/api/admin/roles', { name: 'X', permissions: [] });
  expect(`P2 roles: name too short -> ${r.status}`, r.status === 400);
  r = await as('superAdmin', 'PATCH', `/api/admin/roles/${roles.editor._id}`, { description: 'Blogs and CMS' });
  expect(`P2 roles: update -> ${r.status}`, r.status === 200 && r.json.data.description === 'Blogs and CMS' && r.json.data.staffCount >= 1);
  r = await as('superAdmin', 'DELETE', `/api/admin/roles/${roles.accountant._id}`);
  expect(`P2 roles: delete in use -> ${r.status} ${r.json.code}`, r.status === 409 && r.json.code === 'ROLE_IN_USE' && r.json.staffCount === 1);
  r = await as('superAdmin', 'DELETE', `/api/admin/roles/${roles.accountant._id}?reassignTo=${roles.reception._id}`);
  expect(`P2 roles: delete with reassign -> ${r.status}`, r.status === 200 && r.json.data.staffMoved === 1);
  const moved = await User.findById(staffUsers.staffAccountant._id).select('staffRoleId').lean();
  expect('P2 roles: staff moved to the new role', String(moved?.staffRoleId) === String(roles.reception._id));

  // ── Staff API ──────────────────────────────────────────────────────────────
  r = await as('superAdmin', 'POST', '/api/admin/staff', { name: 'Dup', email: 'lawyera@test.local' });
  expect(`P2 staff: email of a lawyer -> ${r.status}`, r.status === 409 && /a lawyer/.test(r.json.message));
  r = await as('superAdmin', 'PATCH', `/api/admin/staff/${staffUsers.staffNone._id}`, { staffRoleId: String(roles.editor._id) });
  expect(`P2 staff: change role -> ${r.status}`, r.status === 200 && r.json.data.staffRoleId?.name === 'Content Editor');
  r = await as('staffNone', 'GET', '/api/admin/blogs');
  expect(`P2 staff: new role applies on next request -> ${r.status}`, r.status === 200);
  r = await as('superAdmin', 'PATCH', `/api/admin/staff/${users.clientA._id}`, { name: 'Nope' });
  expect(`P2 staff: a client is not a staff member -> ${r.status}`, r.status === 404);
  r = await as('superAdmin', 'PATCH', `/api/admin/staff/${staffUsers.staffNone._id}/block`, { reason: 'Left' });
  expect(`P2 staff: block -> ${r.status}`, r.status === 200 && r.json.data.isBlocked === true);
  r = await as('staffNone', 'GET', '/api/access/catalog');
  expect(`P2 staff: blocked staff signed out -> ${r.status}`, r.status === 403 && r.json.code === 'ACCOUNT_BLOCKED');
  r = await as('superAdmin', 'PATCH', `/api/admin/staff/${staffUsers.staffNone._id}/unblock`);
  expect(`P2 staff: unblock -> ${r.status}`, r.status === 200 && r.json.data.isBlocked === false);
  r = await as('superAdmin', 'DELETE', `/api/admin/staff/${staffUsers.staffEditor._id}`);
  expect(`P2 staff: delete -> ${r.status}`, r.status === 200 && !(await User.exists({ _id: staffUsers.staffEditor._id })));

  server.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await db.stop();

  if (!baseline) {
    fs.writeFileSync(BASELINE_FILE, `${JSON.stringify(recorded, null, 2)}\n`);
    console.log(`\nBaseline written to ${path.relative(process.cwd(), BASELINE_FILE)}`);
  }
  console.log(failures ? `\n${failures} FAILED` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
