// Authorization matrix: every row is a real HTTP request through
// authenticateToken, the route gates and the controllers.
// Phase 1 (characterization): statuses and key body facts are asserted inline;
// every error response's { status, message, code } is also compared to
// endpoints.baseline.json, recorded from the code before the policy refactor.
// UPDATE_BASELINE=1 re-records it. Phase 2 adds staff with firm roles, Phase 3
// lawyer assistants (delegations) and the /api/workspace routes.
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
import workspaceRoutes from '../../src/routes/workspace';
import authRoutes from '../../src/routes/auth';
import StaffAssignment from '../../src/models/StaffAssignment';
import AuditLog from '../../src/models/AuditLog';
import User from '../../src/models/User';
import Role from '../../src/models/Role';
import ContentPage from '../../src/models/ContentPage';
import { ROLE_TEMPLATES } from '../../src/access/roleTemplates';
import { loadAccess } from '../../src/access/loadAccess';
import Case from '../../src/models/Case';
import LawyerProfile from '../../src/models/LawyerProfile';
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
  app.use('/api/workspace/:lawyerId', workspaceRoutes);
  app.use('/api/auth', authRoutes);
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
  await Promise.all([Case.syncIndexes(), Consultation.syncIndexes(), User.syncIndexes(), Role.syncIndexes(), StaffAssignment.syncIndexes()]);

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
  // Phase 4: clients only (lawyers use /api/workspace/me/cases, admins /api/admin/cases)
  await row('GET /api/cases/my-cases',
    { admin: 403, lawyerA: 403, lawyerB: 403, clientA: 200, clientB: 200 },
    (a) => request(a, 'GET', '/api/cases/my-cases'),
    {
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

  // Phase 4: clients only (lawyers use /api/workspace/me/consultations)
  await row('GET /api/consultations/my-consultations',
    { admin: 403, lawyerA: 403, lawyerB: 403, clientA: 200, clientB: 200 },
    (a) => request(a, 'GET', '/api/consultations/my-consultations'),
    {
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

  // Phase 4: the lawyer /me endpoints are gone (the workspace replaced them).
  // GET /me/availability now reaches the public /:lawyerId/availability, which refuses "me".
  for (const [method, url] of [
    ['GET', '/api/lawyers/me/availability'], ['PUT', '/api/lawyers/me/availability'],
    ['GET', '/api/lawyers/me/profile'], ['PUT', '/api/lawyers/me/profile'], ['POST', '/api/lawyers/me/profile/image'],
  ] as const) {
    await row(`${method} ${url} (removed)`,
      { admin: [400, 404], lawyerA: [400, 404], lawyerB: null, clientA: [400, 404], clientB: null },
      (a) => request(a, method, url, method === 'GET' ? undefined : {}));
  }

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
  // The admin cases page records payments through /api/cases/:id. Staff with no
  // case access at all get 404 there since Phase 3 (they can't learn it exists).
  await staffRow('PATCH /api/cases/:id {paymentEntry} (admin page)', { superAdmin: 200, staffEditor: 404, staffReception: 403, staffAccountant: 200, staffNone: 404 },
    async (a) => as(a, 'PATCH', `/api/cases/${(await newCase())._id}`, { paymentEntry: { amount: 5 } }),
    { staffAccountant: (j) => j.data.payments.length === 2 });
  await staffRow('PATCH /api/cases/:id {deletePaymentId} stays super-admin only', { superAdmin: 200, staffEditor: 404, staffReception: 403, staffAccountant: 403, staffNone: 404 },
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

  await staffRow('GET /api/cases/my-cases (staff use /api/workspace instead)', { superAdmin: null, staffEditor: 403, staffReception: 403, staffAccountant: 403, staffNone: 403 },
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
  r = await as('staffNone', 'GET', '/api/blogs/admin/all');
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

  // ══ Phase 3: lawyer assistants (delegations) ════════════════════════════════
  const ALL_LAWYER_SCOPED = [
    'cases.view', 'cases.create', 'cases.edit', 'cases.archive', 'cases.feature', 'cases.finance.view', 'cases.finance.edit',
    'cases.confidential.view', 'cases.confidential.edit', 'appointments.view', 'appointments.manage', 'availability.manage', 'profile.edit',
  ];
  const delegate = (staff: any, lawyer: any, permissions: string[]) =>
    StaffAssignment.create({ staffId: staff._id, lawyerId: lawyer._id, permissions, grantedBy: lawyer._id, grantedByRole: 'lawyer' });
  const p3Staff = {
    S1: await mkStaff('AssistantOne', null),
    S2: await mkStaff('AssistantTwo', null),
    S0: await mkStaff('AssistantNone', null),
  };
  await delegate(p3Staff.S1, users.lawyerA, ['appointments.manage', 'cases.edit']);
  await delegate(p3Staff.S2, users.lawyerA, ALL_LAWYER_SCOPED);
  await delegate(p3Staff.S2, users.lawyerB, ['availability.manage']);
  const p3Tokens = {
    lawyerA: tokens.lawyerA,
    lawyerB: tokens.lawyerB,
    client: tokens.clientA,
    ...Object.fromEntries(Object.entries(p3Staff).map(([k, u]) => [k, generateAccessToken({ _id: u._id, role: u.role, tokenVersion: 0 })])),
  } as Record<'lawyerA' | 'lawyerB' | 'client' | 'S1' | 'S2' | 'S0', string>;
  type P3Actor = keyof typeof p3Tokens;
  const P3_MATRIX: readonly P3Actor[] = ['lawyerA', 'lawyerB', 'S1', 'S2', 'S0', 'client'];
  const p3 = (actor: P3Actor, method: string, url: string, body?: unknown) => send(p3Tokens[actor], method, url, body);
  const p3Row = async (
    label: string,
    expected: Partial<Record<P3Actor, number>>,
    run: (actor: P3Actor) => Promise<{ status: number; json: any }>,
    check?: Partial<Record<P3Actor, (json: any) => boolean>>
  ) => {
    for (const actor of P3_MATRIX) {
      const want = expected[actor];
      if (want === undefined) continue;
      const { status, json } = await run(actor);
      const bodyOk = !check?.[actor] || check[actor]!(json);
      expect(`P3 ${label} :: ${actor} -> ${status}`, status === want && bodyOk, { want, got: status, body: json });
    }
  };

  const CB = await newCase({ lawyerId: users.lawyerB._id, clientId: users.clientB._id, clientEmail: 'clientb@test.local', clientName: 'ClientB' });
  const allOf = (lawyerId: string) => (j: any) => j.data.length > 0 && j.data.every((c: any) => id(c.lawyerId) === lawyerId) && typeof j.meta.counts.active === 'number';
  const stripped = (c: any) => !('payments' in c) && !('internalNotes' in c) && !('caseValue' in c) && !('evidenceSummary' in c);
  const full = (c: any) => 'payments' in c && 'internalNotes' in c;

  // loadAccess and the profile payload
  const s2Access = await loadAccess(p3Staff.S2);
  expect('P3 loadAccess: delegations with implied keys, lawyer names',
    s2Access.delegations.get(A)?.size === 13 && s2Access.delegations.get(B)?.has('availability.manage') === true &&
    s2Access.delegations.get(B)?.size === 1 && s2Access.delegatedLawyers?.map((l) => l.name).join() === 'LawyerA,LawyerB', s2Access.delegatedLawyers);
  const s0Access = await loadAccess(p3Staff.S0);
  expect('P3 loadAccess: staff without a role or delegations', s0Access.firm.size === 0 && s0Access.delegations.size === 0 && s0Access.firmRoleName === null);
  r = await p3('S1', 'GET', '/api/auth/profile');
  const s1Delegation = r.json?.user?.access?.delegations?.[0];
  expect(`P3 profile payload: delegations (expanded) -> ${r.status}`,
    r.status === 200 && r.json.user.access.delegations.length === 1 && s1Delegation.lawyerId === A && s1Delegation.lawyerName === 'LawyerA' &&
    s1Delegation.permissions.includes('cases.view') && s1Delegation.permissions.includes('appointments.view') && !s1Delegation.permissions.includes('cases.finance.view'), r.json);

  // ── Matrix (phase doc §6) ──────────────────────────────────────────────────
  await p3Row('GET /api/workspace/me/cases', { lawyerA: 200, lawyerB: 200, S1: 404, S2: 404, S0: 404, client: 403 },
    (a) => p3(a, 'GET', '/api/workspace/me/cases'),
    { lawyerA: (j) => allOf(A)(j) && j.data.some((c: any) => id(c) === id(CA)) && j.data[0].clientId?.name, lawyerB: allOf(B) });
  await p3Row('GET /api/workspace/<A>/cases', { lawyerA: 200, lawyerB: 404, S1: 200, S2: 200, S0: 404, client: 403 },
    (a) => p3(a, 'GET', `/api/workspace/${A}/cases`),
    { S1: (j) => allOf(A)(j) && j.data.every(stripped), S2: (j) => allOf(A)(j) && j.data.some(full) });
  await p3Row('GET /api/workspace/<B>/cases', { lawyerA: 404, lawyerB: 200, S1: 404, S2: 403, S0: 404, client: 403 },
    (a) => p3(a, 'GET', `/api/workspace/${B}/cases`));
  await p3Row('GET /api/cases/<CA>', { lawyerA: 200, lawyerB: 403, S1: 200, S2: 200, S0: 404, client: 200 },
    (a) => p3(a, 'GET', caUrl),
    { S1: (j) => stripped(j.data), S2: (j) => full(j.data), client: (j) => j.data.internalNotes === undefined });
  await p3Row('GET /api/cases/<CB>', { lawyerA: 403, lawyerB: 200, S1: 404, S2: 403, S0: 404, client: 403 },
    (a) => p3(a, 'GET', `/api/cases/${CB._id}`));
  await p3Row('PATCH /api/cases/<CA> {status}', { lawyerA: 200, lawyerB: 403, S1: 200, S2: 200, S0: 404, client: 403 },
    async (a) => p3(a, 'PATCH', `/api/cases/${(await newCase())._id}`, { status: 'filed' }),
    { S1: (j) => j.data.status === 'filed' && stripped(j.data), S2: (j) => j.data.status === 'filed' && full(j.data) });
  await p3Row('PATCH /api/cases/<CA> {retainerAmount: changed}', { lawyerA: 200, lawyerB: 403, S1: 403, S2: 200, S0: 404, client: 403 },
    async (a) => p3(a, 'PATCH', `/api/cases/${(await newCase())._id}`, { retainerAmount: 1 }),
    { S1: (j) => j.code === 'FIELD_FORBIDDEN' && j.fields?.includes('retainerAmount') });
  // Phase 4: S1 can't see finance, so even an unchanged value is refused (no oracle)
  await p3Row('PATCH /api/cases/<CA> {retainerAmount: unchanged, status}', { lawyerA: 200, S1: 403 },
    async (a) => p3(a, 'PATCH', `/api/cases/${(await newCase())._id}`, { retainerAmount: 10000, status: 'filed' }));
  await p3Row('PATCH /api/cases/<CA>/archive', { lawyerA: 200, lawyerB: 403, S1: 403, S2: 200, S0: 404, client: 403 },
    async (a) => p3(a, 'PATCH', `/api/cases/${(await newCase())._id}/archive`),
    { S2: (j) => j.data.isArchived === true && j.data.archiveOrigin === 'lawyer' });
  await p3Row('PATCH /api/cases/<CA>/toggle-featured', { lawyerA: 200, S1: 403, S2: 200, S0: 404 },
    async (a) => p3(a, 'PATCH', `/api/cases/${(await newCase())._id}/toggle-featured`));
  await p3Row('PUT /api/consultations/<KA>/confirm', { lawyerA: 200, lawyerB: 403, S1: 200, S2: 200, S0: 404, client: 403 },
    async (a) => p3(a, 'PUT', `/api/consultations/${(await newConsultation())._id}/confirm`));
  await p3Row('PUT /api/consultations/<KA>/status {cancelled}', { S1: 200, S0: 404 },
    async (a) => p3(a, 'PUT', `/api/consultations/${(await newConsultation())._id}/status`, { status: 'cancelled' }));
  await p3Row('POST /api/consultations/<KA>/cancel', { S1: 200, S0: 404 },
    async (a) => p3(a, 'POST', `/api/consultations/${(await newConsultation())._id}/cancel`));
  await p3Row('PUT /api/workspace/<B>/availability', { lawyerA: 404, lawyerB: 200, S1: 404, S2: 200, S0: 404, client: 403 },
    (a) => p3(a, 'PUT', `/api/workspace/${B}/availability`, { isAcceptingNewClients: true }),
    { S2: (j) => id(j.data.lawyerId) === B });
  await p3Row('PUT /api/workspace/<A>/profile', { lawyerA: 200, lawyerB: 404, S1: 403, S2: 200, S0: 404, client: 403 },
    (a) => p3(a, 'PUT', `/api/workspace/${A}/profile`, { designation: { en: 'Senior Advocate', bn: '' } }),
    { S2: (j) => id(j.data.userId) === A && j.data.designation?.en === 'Senior Advocate' });
  await p3Row('GET /api/workspace/<A>/consultations', { lawyerA: 200, S1: 200, S2: 200, S0: 404 },
    (a) => p3(a, 'GET', `/api/workspace/${A}/consultations`),
    { S1: (j) => j.consultations.length > 0 && j.consultations.every((c: any) => id(c.lawyerId) === A && c.clientId?.name) });
  await p3Row('GET /api/workspace/<x>/overview', { lawyerA: 200, S1: 200, S2: 200, S0: 404, client: 403 },
    (a) => p3(a, 'GET', `/api/workspace/${a === 'lawyerA' ? 'me' : A}/overview`),
    { S1: (j) => typeof j.data.cases.active === 'number' && typeof j.data.appointments.pending === 'number' && j.data.lawyer.name === 'LawyerA' });
  r = await p3('S2', 'GET', `/api/workspace/${B}/overview`);
  expect(`P3 overview needs cases.view or appointments.view (S2 on B) -> ${r.status}`, r.status === 403);
  r = await p3('S2', 'GET', `/api/workspace/${id(users.clientA._id)}/cases`);
  expect(`P3 workspace of a non-lawyer id -> ${r.status}`, r.status === 404);
  r = await send(tokens.admin, 'GET', `/api/workspace/${A}/cases`);
  expect(`P3 workspace for the super-admin -> ${r.status}`, r.status === 403);
  await p3Row('GET /api/workspace/me/team', { lawyerA: 200, lawyerB: 200, S1: 404, S2: 404, S0: 404, client: 403 },
    (a) => p3(a, 'GET', '/api/workspace/me/team'),
    {
      lawyerA: (j) => j.data.length === 2 && j.data.find((m: any) => m.name === 'AssistantTwo')?.permissions.length === 13,
      lawyerB: (j) => j.data.length === 1 && JSON.stringify(j.data[0].permissions) === '["availability.manage"]',
    });
  r = await p3('S2', 'GET', `/api/workspace/${A}/team`);
  expect(`P3 an assistant can't open the lawyer's team -> ${r.status}`, r.status === 404);

  // A firm role with lawyer-scoped keys opens any lawyer's workspace
  const firmCases = await mkStaff('FirmCases', (await mkRole('Case clerk', ['cases.view']))._id);
  const firmToken = generateAccessToken({ _id: firmCases._id, role: 'staff', tokenVersion: 0 });
  r = await send(firmToken, 'GET', `/api/workspace/${B}/cases`);
  expect(`P3 firm-role staff open any lawyer's workspace -> ${r.status}`, r.status === 200 && allOf(B)(r.json));
  r = await send(firmToken, 'GET', `/api/workspace/${B}/availability`);
  expect(`P3 ... but only for their permissions -> ${r.status}`, r.status === 403);

  // ── Audit: on behalf of, and what the client sees ──────────────────────────
  const KA = await newConsultation();
  r = await p3('S1', 'PUT', `/api/consultations/${KA._id}/confirm`);
  const waitForAudit = async (filter: Record<string, unknown>) => {
    for (let i = 0; i < 40; i++) {
      const entry = await AuditLog.findOne(filter).sort({ createdAt: -1 }).lean();
      if (entry) return entry;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return null;
  };
  const confirmEntry = await waitForAudit({ action: 'consultation.confirmed', targetId: String(KA._id) });
  expect('P3 audit: staff action recorded on behalf of the lawyer',
    confirmEntry?.actorRole === 'staff' && String(confirmEntry.actor) === id(p3Staff.S1._id) &&
    String(confirmEntry.onBehalfOf) === A && confirmEntry.onBehalfOfName === 'LawyerA', confirmEntry);
  r = await p3('client', 'GET', '/api/consultations/notifications');
  const clientText = JSON.stringify(r.json);
  expect('P3 client notifications name the lawyer, never the assistant',
    r.status === 200 && clientText.includes('LawyerA') && !clientText.includes('AssistantOne') && clientText.includes('confirmed by lawyer'), r.json);
  r = await p3('S1', 'GET', '/api/consultations/notifications');
  expect(`P3 assistant notifications cover their lawyer -> ${r.status}`,
    r.status === 200 && r.json.notifications.some((n: any) => n.title === 'New booking for LawyerA') && r.json.notifications.some((n: any) => n.type === 'case'), r.json);
  r = await p3('S0', 'GET', '/api/consultations/notifications');
  expect(`P3 staff without access: no notifications -> ${r.status}`, r.status === 200 && r.json.notifications.length === 0);
  const profileEntry = await waitForAudit({ action: 'profile.updated', onBehalfOf: users.lawyerA._id });
  expect('P3 audit: workspace writes are on behalf of the lawyer, with the actor named',
    profileEntry?.actorName === 'AssistantTwo' && /AssistantTwo updated LawyerA's public profile/.test(profileEntry.summary), profileEntry);
  r = await p3('lawyerA', 'GET', '/api/workspace/me/team/activity');
  expect(`P3 team activity: the assistant's actions, no IP or device -> ${r.status}`,
    r.status === 200 && r.json.data.some((e: any) => e.action === 'consultation.confirmed' && e.actorName === 'AssistantOne') &&
    r.json.data.every((e: any) => !('ip' in e) && !('userAgent' in e) && !('actorEmail' in e)), r.json);
  r = await p3('lawyerB', 'GET', '/api/workspace/me/team/activity');
  expect(`P3 team activity is per lawyer -> ${r.status}`, r.status === 200 && r.json.data.every((e: any) => e.actorName === 'AssistantTwo'));
  r = await send(tokens.admin, 'GET', `/api/admin/audit-logs?onBehalfOf=${A}`);
  expect(`P3 admin audit filter: on behalf of -> ${r.status}`,
    r.status === 200 && r.json.data.length > 0 && r.json.data.every((e: any) => String(e.onBehalfOf) === A));

  // ── Restore rules ───────────────────────────────────────────────────────────
  let c = await newCase();
  await p3('S2', 'PATCH', `/api/cases/${c._id}/archive`);
  r = await p3('lawyerA', 'PATCH', `/api/cases/${c._id}/restore`);
  expect(`P3 restore: lawyer restores what the assistant archived -> ${r.status}`, r.status === 200 && r.json.data.isArchived === false);
  c = await newCase();
  await send(tokens.admin, 'PATCH', `/api/admin/cases/${c._id}/archive`);
  r = await p3('S2', 'PATCH', `/api/cases/${c._id}/restore`);
  expect(`P3 restore: firm-archived -> ${r.status} ${r.json.code}`, r.status === 403 && r.json.code === 'ADMIN_RESTORE_ONLY');
  c = await archivedByLawyerA();
  r = await p3('S2', 'PATCH', `/api/cases/${c._id}/restore`);
  expect(`P3 restore: legacy case archived by the lawyer -> ${r.status}`, r.status === 200);
  c = await newCase({ isArchived: true, archivedAt: new Date(), archivedBy: users.admin._id, archiveReason: 'manual' });
  r = await p3('lawyerA', 'PATCH', `/api/cases/${c._id}/restore`);
  expect(`P3 restore: legacy case archived by the admin -> ${r.status}`, r.status === 403 && r.json.code === 'ADMIN_RESTORE_ONLY');

  // ── Workspace case creation ────────────────────────────────────────────────
  const newCaseBody = { lawyerId: B, clientEmail: 'ws@test.local', clientName: 'WS', type: 'civil', title: 'T', description: 'D' };
  r = await p3('S2', 'POST', `/api/workspace/${A}/cases`, newCaseBody);
  expect(`P3 POST workspace case: forced to the workspace lawyer -> ${r.status}`, r.status === 201 && id(r.json.data.lawyerId) === A);
  r = await p3('S1', 'POST', `/api/workspace/${A}/cases`, newCaseBody);
  expect(`P3 POST workspace case without cases.create -> ${r.status}`, r.status === 403);
  r = await p3('S2', 'POST', '/api/cases', newCaseBody);
  expect(`P3 POST /api/cases for a lawyer without cases.create -> ${r.status}`, r.status === 403);
  // cases.create alone can't set finance or confidential fields on the new case
  const creator = await mkStaff('CaseCreator', null);
  await delegate(creator, users.lawyerB, ['cases.create']);
  const creatorToken = generateAccessToken({ _id: creator._id, role: 'staff', tokenVersion: 0 });
  r = await send(creatorToken, 'POST', `/api/workspace/${B}/cases`, { ...newCaseBody, caseValue: 5, internalNotes: 'x', retainerPaid: false, witnessNames: [] });
  expect(`P3 create with finance/confidential values, no permission -> ${r.status}`,
    r.status === 403 && r.json.code === 'FIELD_FORBIDDEN' && JSON.stringify(r.json.fields) === '["caseValue","internalNotes"]', r.json);
  r = await send(creatorToken, 'POST', `/api/workspace/${B}/cases`, { ...newCaseBody, caseValue: '', retainerPaid: false, witnessNames: [] });
  expect(`P3 create with blank finance/confidential fields -> ${r.status}`, r.status === 201 && stripped(r.json.data), r.json);
  const clerk = await mkStaff('CreateClerk', (await mkRole('Intake clerk', ['cases.create']))._id);
  r = await send(generateAccessToken({ _id: clerk._id, role: 'staff', tokenVersion: 0 }), 'POST', '/api/admin/cases', { ...newCaseBody, totalPayment: 100 });
  expect(`P3 admin create with totalPayment, no finance permission -> ${r.status}`, r.status === 403 && r.json.code === 'FIELD_FORBIDDEN', r.json);

  // ── Invites (lawyer's "My Team") ───────────────────────────────────────────
  r = await p3('lawyerA', 'POST', '/api/workspace/me/team', { email: 'NewAssistant@test.local', name: 'New Assistant', permissions: ['appointments.manage', 'availability.manage'] });
  const invited = await User.findOne({ email: 'newassistant@test.local' }).lean();
  expect(`P3 invite: new email creates a staff account and a delegation -> ${r.status}`,
    r.status === 201 && r.json.created === true && invited?.role === 'staff' && !invited.staffRoleId &&
    Boolean(await StaffAssignment.exists({ staffId: invited._id, lawyerId: users.lawyerA._id })), r.json);
  r = await p3('lawyerB', 'POST', '/api/workspace/me/team', { email: 'newassistant@test.local', permissions: ['cases.view'] });
  expect(`P3 invite: existing staff email just adds the delegation -> ${r.status}`, r.status === 201 && r.json.created === false);
  r = await p3('lawyerA', 'POST', '/api/workspace/me/team', { email: 'clienta@test.local', name: 'X Y', permissions: ['cases.view'] });
  expect(`P3 invite: a client's email -> ${r.status} ${r.json.code}`, r.status === 409 && r.json.code === 'EMAIL_NOT_ASSIGNABLE' && !/client/i.test(r.json.message));
  r = await p3('lawyerA', 'POST', '/api/workspace/me/team', { email: 'lawyerb@test.local', name: 'X Y', permissions: ['cases.view'] });
  expect(`P3 invite: a lawyer's email -> ${r.status} ${r.json.code}`, r.status === 409 && r.json.code === 'EMAIL_NOT_ASSIGNABLE');
  r = await p3('lawyerA', 'POST', '/api/workspace/me/team', { email: 'someone@test.local', name: 'X Y', permissions: ['blogs.manage'] });
  expect(`P3 invite: firm-only permission -> ${r.status}`, r.status === 400);
  r = await p3('lawyerA', 'POST', '/api/workspace/me/team', { email: 'someone@test.local', name: 'X Y', permissions: [] });
  expect(`P3 invite: no permissions -> ${r.status}`, r.status === 400);
  r = await p3('lawyerA', 'POST', '/api/workspace/me/team', { email: 'brandnew@test.local', permissions: ['cases.view'] });
  expect(`P3 invite: new email without a name -> ${r.status}`, r.status === 400 && !(await User.exists({ email: 'brandnew@test.local' })));
  r = await p3('lawyerA', 'POST', '/api/workspace/me/team', { email: 'assistanttwo@test.local', permissions: ['cases.view'] });
  expect(`P3 invite: already an assistant -> ${r.status}`, r.status === 409 && r.json.code === 'ALREADY_ASSISTANT');
  r = await p3('lawyerA', 'POST', '/api/workspace/me/team', { email: 'staffblocked@test.local', permissions: ['cases.view'] });
  expect(`P3 invite: a blocked staff account -> ${r.status}`, r.status === 409 && r.json.code === 'STAFF_BLOCKED');
  r = await p3('S2', 'POST', `/api/workspace/${A}/team`, { email: 'x@test.local', name: 'X Y', permissions: ['cases.view'] });
  expect(`P3 invite: assistants can't invite -> ${r.status}`, r.status === 404);

  // ── Isolation and revocation ───────────────────────────────────────────────
  r = await p3('lawyerA', 'PATCH', `/api/workspace/me/team/${p3Staff.S2._id}`, { permissions: ['cases.view'] });
  const s2OnB = await StaffAssignment.findOne({ staffId: p3Staff.S2._id, lawyerId: users.lawyerB._id }).lean();
  expect(`P3 isolation: a lawyer's PATCH changes only their delegation -> ${r.status}`,
    r.status === 200 && JSON.stringify(r.json.data.permissions) === '["cases.view"]' && JSON.stringify(s2OnB?.permissions) === '["availability.manage"]', r.json);
  const updatedEntry = await waitForAudit({ action: 'delegation.updated', targetId: id(p3Staff.S2._id) });
  expect('P3 audit: delegation.updated lists added and removed', updatedEntry?.metadata?.removed?.includes('profile.edit') && updatedEntry.metadata.by === 'lawyer', updatedEntry);
  r = await p3('lawyerB', 'PATCH', `/api/workspace/me/team/${p3Staff.S1._id}`, { permissions: ['cases.view'] });
  expect(`P3 isolation: PATCH someone else's assistant -> ${r.status}`, r.status === 404);
  r = await p3('lawyerB', 'DELETE', `/api/workspace/me/team/${p3Staff.S1._id}`);
  expect(`P3 isolation: DELETE someone else's assistant -> ${r.status}`, r.status === 404);
  r = await p3('S1', 'GET', `/api/workspace/${A}/cases`);
  expect(`P3 revocation: before -> ${r.status}`, r.status === 200);
  r = await p3('lawyerA', 'DELETE', `/api/workspace/me/team/${p3Staff.S1._id}`);
  expect(`P3 revocation: lawyer removes the assistant -> ${r.status}`, r.status === 200 && Boolean(await User.exists({ _id: p3Staff.S1._id })));
  r = await p3('S1', 'GET', `/api/workspace/${A}/cases`);
  expect(`P3 revocation: same token, next request -> ${r.status}`, r.status === 404);
  r = await p3('S1', 'GET', caUrl);
  expect(`P3 revocation: single records too -> ${r.status}`, r.status === 404);

  // ── Super-admin delegation management ──────────────────────────────────────
  const S0 = id(p3Staff.S0._id);
  r = await send(tokens.admin, 'POST', `/api/admin/staff/${S0}/delegations`, { lawyerId: B, permissions: ['cases.view'] });
  expect(`P3 admin: grant -> ${r.status}`, r.status === 201 && r.json.data[0]?.lawyerName === 'LawyerB' && r.json.data[0].grantedByRole === 'admin');
  r = await p3('S0', 'GET', `/api/workspace/${B}/cases`);
  expect(`P3 admin grant applies on the next request -> ${r.status}`, r.status === 200);
  r = await send(tokens.admin, 'POST', `/api/admin/staff/${S0}/delegations`, { lawyerId: B, permissions: ['cases.view'] });
  expect(`P3 admin: grant twice -> ${r.status}`, r.status === 409);
  r = await send(tokens.admin, 'POST', `/api/admin/staff/${S0}/delegations`, { lawyerId: id(users.clientA._id), permissions: ['cases.view'] });
  expect(`P3 admin: grant for a non-lawyer -> ${r.status}`, r.status === 404);
  r = await send(tokens.admin, 'POST', `/api/admin/staff/${S0}/delegations`, { lawyerId: A, permissions: ['audit.view'] });
  expect(`P3 admin: firm-only permission -> ${r.status}`, r.status === 400);
  r = await send(tokens.admin, 'PATCH', `/api/admin/staff/${S0}/delegations/${B}`, { permissions: ['cases.view', 'availability.manage'] });
  expect(`P3 admin: update -> ${r.status}`, r.status === 200 && r.json.data[0].permissions.length === 2);
  r = await send(tokens.admin, 'GET', `/api/admin/staff/${S0}`);
  expect(`P3 admin: staff details list delegations -> ${r.status}`, r.status === 200 && r.json.data.delegations[0]?.lawyerActive === true && r.json.data.delegations[0].grantedByName === 'Admin');
  r = await send(tokens.admin, 'GET', `/api/admin/lawyers/${B}`);
  expect(`P3 admin: lawyer details list assistants -> ${r.status}`,
    r.status === 200 && r.json.data.assistants.some((x: any) => x.name === 'AssistantNone') && r.json.data.assistants.some((x: any) => x.name === 'AssistantTwo'));
  r = await send(tokens.admin, 'GET', `/api/admin/lawyers/${B}/deletion-impact`);
  expect(`P3 admin: deletion impact counts assistants -> ${r.status}`, r.status === 200 && r.json.data.assistantCount === 4, r.json.data?.assistantCount);
  r = await send(tokens.admin, 'DELETE', `/api/admin/staff/${S0}/delegations/${B}`);
  expect(`P3 admin: revoke -> ${r.status}`, r.status === 200 && r.json.data.length === 0);
  r = await p3('S0', 'GET', `/api/workspace/${B}/cases`);
  expect(`P3 admin revoke applies on the next request -> ${r.status}`, r.status === 404);
  r = await p3('S2', 'POST', `/api/admin/staff/${S0}/delegations`, { lawyerId: B, permissions: ['cases.view'] });
  expect(`P3 admin delegation routes are super-admin only -> ${r.status}`, r.status === 403);

  // ── Lawyer removal suspends delegations; restoring brings them back ────────
  r = await send(tokens.admin, 'DELETE', `/api/admin/lawyers/${A}`);
  expect(`P3 removal: admin removes lawyer A -> ${r.status}`, r.status === 200, r.json);
  r = await p3('S2', 'GET', `/api/workspace/${A}/cases`);
  expect(`P3 removal: S2 loses A -> ${r.status}`, r.status === 404);
  r = await p3('S2', 'GET', `/api/workspace/${B}/availability`);
  expect(`P3 removal: S2 keeps B -> ${r.status}`, r.status === 200);
  expect('P3 removal: delegations are kept', Boolean(await StaffAssignment.exists({ staffId: p3Staff.S2._id, lawyerId: users.lawyerA._id })));
  r = await send(tokens.admin, 'PATCH', `/api/admin/lawyers/${A}/restore`);
  expect(`P3 removal: admin restores lawyer A -> ${r.status}`, r.status === 200, r.json);
  r = await p3('S2', 'GET', `/api/workspace/${A}/cases`);
  expect(`P3 removal: S2 gets A back -> ${r.status}`, r.status === 200);

  // ── Deleting a staff account removes their delegations ─────────────────────
  r = await send(tokens.admin, 'DELETE', `/api/admin/staff/${p3Staff.S2._id}`);
  expect(`P3 staff deletion -> ${r.status}`, r.status === 200 && !(await StaffAssignment.exists({ staffId: p3Staff.S2._id })));

  // ══ Phase 4: security review fixes ══════════════════════════════════════════
  // S1 was revoked above, and removing lawyer A revoked their sessions
  await StaffAssignment.deleteMany({ staffId: p3Staff.S1._id });
  await delegate(p3Staff.S1, users.lawyerA, ['cases.edit']);
  const lawyerANow = await User.findById(users.lawyerA._id).select('role tokenVersion').lean();
  tokens.lawyerA = generateAccessToken({ _id: users.lawyerA._id, role: 'lawyer', tokenVersion: lawyerANow?.tokenVersion ?? 0 });
  // A hidden field is refused even when the guess matches (no 200/403 oracle)
  r = await p3('S1', 'PATCH', `/api/cases/${(await newCase())._id}`, { caseValue: 50000 });
  expect(`P4 S1 PATCH unchanged hidden caseValue -> ${r.status}`, r.status === 403 && isFieldForbidden('caseValue')(r.json), r.json);
  r = await p3('S1', 'PATCH', `/api/cases/${(await newCase())._id}`, { internalNotes: 'secret note', witnessNames: ['W1'] });
  expect(`P4 S1 PATCH unchanged hidden confidential -> ${r.status}`, r.status === 403 && isFieldForbidden('internalNotes')(r.json) && isFieldForbidden('witnessNames')(r.json), r.json);
  r = await p3('S1', 'PATCH', `/api/cases/${(await newCase())._id}`, { status: 'filed', stage: 'intake' });
  expect(`P4 S1 PATCH visible fields still fine -> ${r.status}`, r.status === 200);

  // The linked client follows clientEmail (needs cases.assign); clientId from the body is ignored
  const caseEditorRole = await mkRole('Case Editor', ['cases.edit']);
  const caseEditor = await mkStaff('StaffCaseEditor', caseEditorRole._id);
  const caseEditorToken = generateAccessToken({ _id: caseEditor._id, role: caseEditor.role, tokenVersion: 0 });
  const relink = await newCase();
  r = await send(caseEditorToken, 'PATCH', `/api/admin/cases/${relink._id}`, { clientId: id(users.clientB._id), title: 'Edited' });
  const relinked = await Case.findById(relink._id).select('clientId title').lean();
  expect(`P4 case editor PATCH admin case {clientId} is ignored -> ${r.status}`,
    r.status === 200 && id(relinked?.clientId) === id(users.clientA._id) && relinked?.title === 'Edited', relinked);
  r = await send(caseEditorToken, 'PATCH', `/api/admin/cases/${relink._id}`, { clientEmail: 'clientb@test.local' });
  expect(`P4 case editor PATCH admin case {clientEmail} -> ${r.status}`, r.status === 403 && isFieldForbidden('clientEmail')(r.json), r.json);
  r = await send(tokens.admin, 'PATCH', `/api/admin/cases/${relink._id}`, { clientEmail: 'ClientB@test.local' });
  expect(`P4 admin PATCH admin case {clientEmail} relinks the client -> ${r.status}`,
    r.status === 200 && id(r.json.data.clientId) === id(users.clientB._id) && r.json.data.clientEmail === 'clientb@test.local', r.json);
  r = await send(tokens.admin, 'PATCH', `/api/admin/cases/${relink._id}`, { clientEmail: 'nobody@test.local' });
  expect(`P4 admin PATCH admin case {clientEmail} with no account unlinks -> ${r.status}`, r.status === 200 && !r.json.data.clientId, r.json);
  r = await request('lawyerA', 'POST', '/api/cases', {
    clientId: id(users.clientB._id), clientEmail: 'clienta@test.local', clientName: 'ClientA', type: 'civil', title: 'T', description: '<p>D</p>',
  });
  expect(`P4 lawyer POST /api/cases: clientId comes from clientEmail -> ${r.status}`,
    r.status === 201 && id(r.json.data.clientId) === id(users.clientA._id), r.json);

  // Login emails: super-admin only (email + "forgot password" would take the account over)
  const lawyerManagerRole = await mkRole('Lawyer Manager', ['lawyers.manage']);
  const lawyerManager = await mkStaff('StaffLawyerManager', lawyerManagerRole._id);
  const lawyerManagerToken = generateAccessToken({ _id: lawyerManager._id, role: lawyerManager.role, tokenVersion: 0 });
  r = await send(lawyerManagerToken, 'PATCH', `/api/admin/lawyers/${B}`, { email: 'taken-over@test.local' });
  expect(`P4 lawyers.manage PATCH lawyer {email} -> ${r.status}`, r.status === 403 && isFieldForbidden('email')(r.json), r.json);
  r = await send(lawyerManagerToken, 'PATCH', `/api/admin/lawyers/${B}`, { email: 'lawyerb@test.local', name: 'LawyerB' });
  expect(`P4 lawyers.manage PATCH lawyer {same email, name} -> ${r.status}`, r.status === 200, r.json);
  const emailClient = await User.create({ name: 'EmailClient', email: 'emailclient@test.local', password: 'Passw0rd!x', role: 'client', isVerified: true });
  r = await as('staffManager', 'PATCH', `/api/admin/users/${emailClient._id}`, { email: 'taken-over@test.local' });
  expect(`P4 clients.manage PATCH client {email} -> ${r.status}`, r.status === 403 && isFieldForbidden('email')(r.json), r.json);
  r = await as('staffManager', 'PATCH', `/api/admin/users/${emailClient._id}`, { name: 'Renamed Client' });
  expect(`P4 clients.manage PATCH client {name} -> ${r.status}`, r.status === 200, r.json);
  r = await send(tokens.admin, 'PATCH', `/api/admin/users/${emailClient._id}`, { email: 'moved@test.local' });
  expect(`P4 super-admin PATCH client {email} -> ${r.status}`, r.status === 200, r.json);

  // User details: the case and booking lists need their own firm permissions
  const clientViewerRole = await mkRole('Client Viewer', ['clients.view']);
  const clientViewer = await mkStaff('StaffClientViewer', clientViewerRole._id);
  r = await send(generateAccessToken({ _id: clientViewer._id, role: 'staff', tokenVersion: 0 }), 'GET', `/api/admin/users/${users.clientA._id}`);
  expect(`P4 clients.view only: user details without cases/bookings -> ${r.status}`,
    r.status === 200 && r.json.data.user && r.json.data.cases.length === 0 && r.json.data.consultations.length === 0, r.json);
  r = await as('staffManager', 'GET', `/api/admin/users/${users.clientA._id}`);
  expect(`P4 office manager: user details with cases and bookings -> ${r.status}`,
    r.status === 200 && r.json.data.cases.length > 0 && r.json.data.consultations.length > 0, r.json?.data?.stats);

  // The profile image URL is set only by the upload (it names the image the upload deletes)
  await LawyerProfile.updateOne({ userId: users.lawyerA._id }, { $set: { profileImageUrl: 'https://res.example/lawweb/profiles/mine.jpg' } }, { upsert: true });
  r = await request('lawyerA', 'PUT', '/api/workspace/me/profile', { profileImageUrl: 'https://res.example/lawweb/profiles/someone-else.jpg', designation: { en: 'Advocate', bn: '' } });
  const imageAfter = await LawyerProfile.findOne({ userId: users.lawyerA._id }).select('profileImageUrl').lean();
  expect(`P4 PUT profile {profileImageUrl} is ignored -> ${r.status}`,
    r.status === 200 && imageAfter?.profileImageUrl === 'https://res.example/lawweb/profiles/mine.jpg', { status: r.status, imageAfter });

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
