// Pure checks for the access layer (RBAC Phase 1): catalog integrity, can(),
// lawyersFor/scopeFor shapes, case projection and field-level write checks.
import mongoose from 'mongoose';
import {
  PERMISSIONS, LAWYER_SCOPED, FIRM_ONLY, LAWYER_SELF_PERMISSIONS, withImplied, isPermission, Permission,
} from '../../src/access/permissions';
import { can, canInWorkspace, lawyersFor, scopeFor, isClientOfCase, isClientOfConsultation, refId, hasAnyAccessTo, hiddenFromStaff } from '../../src/access/policy';
import { cleanDelegationPermissions } from '../../src/access/delegations';
import { projectCase, canWriteCase, forbiddenCaseWrites } from '../../src/access/projection';
import { loadAccess } from '../../src/access/loadAccess';
import { ROLE_TEMPLATES } from '../../src/access/roleTemplates';
import type { Access, AccountKind } from '../../src/access/types';

let failures = 0;
const expect = (name: string, cond: boolean, detail?: unknown) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) { failures++; if (detail !== undefined) console.log('      ', JSON.stringify(detail)); }
};

const oid = () => new mongoose.Types.ObjectId();
const A = oid();
const B = oid();
const C = oid();
const clientId = oid();

const mk = (kind: AccountKind, userId: unknown, firm: string[] = [], delegations: [unknown, string[]][] = []): Access => ({
  userId: String(userId),
  kind,
  isSuperAdmin: kind === 'admin',
  firm: withImplied(firm),
  delegations: new Map(delegations.map(([id, perms]) => [String(id), withImplied(perms)])),
});

const admin = mk('admin', oid());
const lawyerA = mk('lawyer', A);
const client = mk('client', clientId);
const staffFirm = mk('staff', oid(), ['appointments.view']);
const staffDelegated = mk('staff', oid(), [], [[A, ['cases.view']]]);
const staffMulti = mk('staff', oid(), [], [[A, ['cases.edit']], [B, ['cases.view']], [C, ['appointments.view']]]);

(async () => {
  // ── Catalog integrity ──────────────────────────────────────────────────────
  const keys = PERMISSIONS.map((p) => p.key as string);
  expect('catalog: keys are unique', new Set(keys).size === keys.length);
  expect('catalog: every implies target exists',
    PERMISSIONS.every((p) => ((p as { implies?: readonly string[] }).implies ?? []).every((k) => isPermission(k))));
  expect('catalog: no firm-only key is lawyer-scoped', [...FIRM_ONLY].every((k) => !LAWYER_SCOPED.has(k)));
  expect('catalog: scopes partition the catalog', LAWYER_SCOPED.size + FIRM_ONLY.size === PERMISSIONS.length);
  expect('catalog: lawyers hold every lawyer-scoped key', LAWYER_SELF_PERMISSIONS === LAWYER_SCOPED && LAWYER_SCOPED.size === 13);
  expect('catalog: every entry has a label and group', PERMISSIONS.every((p) => p.label && p.group));

  const fin = withImplied(['cases.finance.edit']);
  expect('withImplied: transitive (finance.edit -> finance.view -> cases.view)',
    fin.has('cases.finance.edit') && fin.has('cases.finance.view') && fin.has('cases.view') && fin.size === 3, [...fin]);
  const assign = withImplied(['cases.assign']);
  expect('withImplied: cases.assign -> edit, create, view', ['cases.assign', 'cases.edit', 'cases.create', 'cases.view'].every((k) => assign.has(k as Permission)) && assign.size === 4, [...assign]);
  const stale = withImplied(['cases.view', 'no.such.key', 'roles.manage', '']);
  expect('withImplied: drops unknown keys', stale.size === 1 && stale.has('cases.view'), [...stale]);
  expect('withImplied: empty input', withImplied([]).size === 0);

  // ── can() truth table ──────────────────────────────────────────────────────
  const onA = { lawyerId: A };
  const onB = { lawyerId: B };
  expect('can: super-admin, any perm, any lawyer, no context', can(admin, 'cases.finance.edit', onB) && can(admin, 'audit.view') && can(admin, 'cases.view'));
  expect('can: lawyer A on A (every lawyer-scoped key)', [...LAWYER_SCOPED].every((p) => can(lawyerA, p, onA)));
  expect('can: lawyer A on A with populated lawyerId', can(lawyerA, 'cases.view', { lawyerId: { _id: A, name: 'A' } }));
  expect('can: lawyer A on A with string lawyerId', can(lawyerA, 'cases.view', { lawyerId: String(A) }));
  expect('can: lawyer A on B -> false', [...LAWYER_SCOPED].every((p) => !can(lawyerA, p, onB)));
  expect('can: lawyer A without context -> false', !can(lawyerA, 'cases.view'));
  expect('can: lawyer, firm-only key on own -> false', [...FIRM_ONLY].every((p) => !can(lawyerA, p, onA)));
  expect('can: client -> false everywhere', [...PERMISSIONS].every((p) => !can(client, p.key, { lawyerId: A }) && !can(client, p.key)));
  expect('can: staff firm appointments.view on any lawyer + no context',
    can(staffFirm, 'appointments.view', onA) && can(staffFirm, 'appointments.view', onB) && can(staffFirm, 'appointments.view'));
  expect('can: staff firm, not granted -> false', !can(staffFirm, 'appointments.manage', onA) && !can(staffFirm, 'cases.view', onA));
  expect('can: staff delegated cases.view on A', can(staffDelegated, 'cases.view', onA));
  expect('can: staff delegated, on B -> false', !can(staffDelegated, 'cases.view', onB));
  expect('can: staff delegated, no context -> false', !can(staffDelegated, 'cases.view'));
  expect('can: staff delegated, other perm on A -> false', !can(staffDelegated, 'cases.edit', onA) && !can(staffDelegated, 'cases.finance.view', onA));
  expect('can: staff delegation implies (edit -> view)', can(staffMulti, 'cases.view', onA) && can(staffMulti, 'cases.edit', onA) && !can(staffMulti, 'cases.edit', onB));
  expect('can: no lawyerId in ctx object', !can(staffDelegated, 'cases.view', { lawyerId: undefined }) && !can(lawyerA, 'cases.view', { lawyerId: null }));

  expect('canInWorkspace: lawyer on own', canInWorkspace(lawyerA, 'cases.archive', onA));
  expect('canInWorkspace: admin -> false (uses /api/admin)', !canInWorkspace(admin, 'cases.archive', onA));
  expect('canInWorkspace: staff delegated', canInWorkspace(staffDelegated, 'cases.view', onA) && !canInWorkspace(staffDelegated, 'cases.view', onB));
  expect('canInWorkspace: client -> false', !canInWorkspace(client, 'appointments.manage', onA));

  // ── lawyersFor / scopeFor shapes ───────────────────────────────────────────
  expect('lawyersFor: super-admin -> all', lawyersFor(admin, 'cases.view') === 'all');
  expect('lawyersFor: staff firm -> all', lawyersFor(staffFirm, 'appointments.view') === 'all');
  expect('lawyersFor: lawyer -> [self]', JSON.stringify(lawyersFor(lawyerA, 'cases.view')) === JSON.stringify([String(A)]));
  expect('lawyersFor: lawyer, firm-only -> []', (lawyersFor(lawyerA, 'audit.view') as string[]).length === 0);
  expect('lawyersFor: client -> []', (lawyersFor(client, 'cases.view') as string[]).length === 0);
  const multi = lawyersFor(staffMulti, 'cases.view') as string[];
  expect('lawyersFor: staff delegations with the perm', multi.length === 2 && multi.includes(String(A)) && multi.includes(String(B)), multi);

  const all = scopeFor(admin, 'cases.view');
  expect('scopeFor: all -> {}', all !== null && Object.keys(all).length === 0);
  expect('scopeFor: none -> null', scopeFor(client, 'cases.view') === null && scopeFor(staffDelegated, 'appointments.view') === null);
  const single = scopeFor(lawyerA, 'cases.view') as Record<string, any>;
  expect('scopeFor: one id -> { lawyerId: ObjectId }', single.lawyerId instanceof mongoose.Types.ObjectId && String(single.lawyerId) === String(A));
  const many = scopeFor(staffMulti, 'cases.view', 'lawyer') as Record<string, any>;
  expect('scopeFor: many ids -> { field: { $in } }', Array.isArray(many.lawyer?.$in) && many.lawyer.$in.length === 2 && many.lawyer.$in.every((x: unknown) => x instanceof mongoose.Types.ObjectId));

  // ── Client helpers ─────────────────────────────────────────────────────────
  expect('isClientOfCase: raw clientId', isClientOfCase(client, { clientId }));
  expect('isClientOfCase: populated clientId', isClientOfCase(client, { clientId: { _id: clientId, name: 'C' } }));
  expect('isClientOfCase: other client / null', !isClientOfCase(client, { clientId: oid() }) && !isClientOfCase(client, { clientId: null }));
  expect('isClientOfCase: non-client kind -> false', !isClientOfCase(mk('lawyer', clientId), { clientId }));
  expect('isClientOfConsultation', isClientOfConsultation(client, { clientId }) && !isClientOfConsultation(client, { clientId: oid() }));
  expect('refId: handles null, raw, populated', refId(null) === null && refId(A) === String(A) && refId({ _id: A }) === String(A));

  // ── projectCase ────────────────────────────────────────────────────────────
  const caseObj = () => ({
    _id: oid(), lawyerId: A, clientId, title: 'T', status: 'active',
    caseValue: 1, retainerAmount: 2, estimatedFee: 3, retainerPaid: true, totalPayment: 4, payments: [{ amount: 4 }],
    internalNotes: 'secret', evidenceSummary: 'ev', witnessNames: ['w'],
    archiveNote: 'n', archivedBy: { _id: A, name: 'A' }, formerLawyer: { name: 'Old', email: 'old@x', barId: 'B1' },
  });
  const full = caseObj();
  const asAdmin = projectCase(full, admin);
  expect('projectCase: admin sees everything', Object.keys(full).every((k) => k in asAdmin));
  const asLawyer = projectCase({ ...full, lawyerId: { _id: A, name: 'A' } }, lawyerA);
  expect('projectCase: own lawyer (populated) sees everything', Object.keys(full).every((k) => k in asLawyer));
  const asClient = projectCase(full, client);
  expect('projectCase: client loses internalNotes/archiveNote/archivedBy',
    !('internalNotes' in asClient) && !('archiveNote' in asClient) && !('archivedBy' in asClient));
  expect('projectCase: client formerLawyer reduced to name', JSON.stringify(asClient.formerLawyer) === JSON.stringify({ name: 'Old' }));
  expect('projectCase: client keeps finance fields (unchanged rule)', asClient.caseValue === 1 && asClient.payments.length === 1);
  const asStaff = projectCase(full, staffDelegated);
  expect('projectCase: staff without finance/confidential loses them',
    ['caseValue', 'retainerAmount', 'estimatedFee', 'retainerPaid', 'totalPayment', 'payments', 'internalNotes', 'evidenceSummary', 'witnessNames'].every((k) => !(k in asStaff)) && asStaff.title === 'T');
  const asFinance = projectCase(full, mk('staff', oid(), [], [[A, ['cases.finance.view']]]));
  expect('projectCase: staff with finance.view keeps finance only', asFinance.caseValue === 1 && !('internalNotes' in asFinance));
  expect('projectCase: input not mutated', full.internalNotes === 'secret' && full.formerLawyer.email === 'old@x');
  const doc = { ...caseObj(), toObject() { return { lawyerId: A, internalNotes: 'x', caseValue: 9 }; } };
  expect('projectCase: uses toObject() on documents', projectCase(doc, staffDelegated).internalNotes === undefined && projectCase(doc, lawyerA).caseValue === 9);

  // ── canWriteCase / forbiddenCaseWrites ─────────────────────────────────────
  expect('canWriteCase: admin, own lawyer', canWriteCase(admin, A) && canWriteCase(lawyerA, A));
  expect('canWriteCase: other lawyer, client, view-only staff -> false', !canWriteCase(lawyerA, B) && !canWriteCase(client, A) && !canWriteCase(staffDelegated, A));
  const accountant = mk('staff', oid(), [], [[A, ['cases.finance.edit']]]);
  expect('canWriteCase: finance-only staff may PATCH', canWriteCase(accountant, A));

  const current = { lawyerId: A, status: 'active', caseValue: 100, internalNotes: 'secret', nextCourtDate: new Date('2026-11-01T00:00:00.000Z'), clientPhone: undefined, witnessNames: ['w'] };
  const everything = { status: 'filed', caseValue: 5, internalNotes: 'changed', hearingEntry: { date: '2026-11-01', description: 'x' }, paymentEntry: { amount: 1 } };
  expect('forbiddenCaseWrites: admin -> []', forbiddenCaseWrites(admin, current, everything).length === 0);
  expect('forbiddenCaseWrites: own lawyer -> []', forbiddenCaseWrites(lawyerA, current, everything).length === 0);
  const unchanged = { status: 'active', nextCourtDate: '2026-11-01', clientPhone: '' };
  expect('forbiddenCaseWrites: unchanged values pass (incl. date string, empty vs undefined)',
    forbiddenCaseWrites(accountant, current, { ...unchanged, caseValue: 100 }).length === 0 && forbiddenCaseWrites(staffDelegated, current, unchanged).length === 0,
    forbiddenCaseWrites(staffDelegated, current, unchanged));
  // Phase 4: a field the actor can't see is refused even when the value matches,
  // or 200 vs 403 would reveal it
  const hiddenUnchanged = forbiddenCaseWrites(staffDelegated, current, { caseValue: 100, internalNotes: 'secret', witnessNames: ['w'] });
  expect('forbiddenCaseWrites: hidden fields refused even when unchanged (no oracle)',
    JSON.stringify(hiddenUnchanged.sort()) === JSON.stringify(['caseValue', 'internalNotes', 'witnessNames']), hiddenUnchanged);
  const financeViewer = mk('staff', oid(), [], [[A, ['cases.finance.view']]]);
  expect('forbiddenCaseWrites: visible but read-only finance: unchanged passes, change refused',
    forbiddenCaseWrites(financeViewer, current, { caseValue: 100 }).length === 0 &&
    JSON.stringify(forbiddenCaseWrites(financeViewer, current, { caseValue: 7 })) === JSON.stringify(['caseValue']));
  const firmEditor = mk('staff', oid(), ['cases.edit']);
  expect('forbiddenCaseWrites (admin form): clientEmail needs cases.assign, clientId is not a form field',
    JSON.stringify(forbiddenCaseWrites(firmEditor, { ...current, clientEmail: 'a@x.com' }, { clientEmail: 'b@x.com' }, { adminForm: true })) === JSON.stringify(['clientEmail']) &&
    forbiddenCaseWrites(mk('staff', oid(), ['cases.assign']), { ...current, clientEmail: 'a@x.com' }, { clientEmail: 'b@x.com' }, { adminForm: true }).length === 0);
  const accountantViolations = forbiddenCaseWrites(accountant, current, everything);
  expect('forbiddenCaseWrites: accountant may change finance only',
    JSON.stringify(accountantViolations.sort()) === JSON.stringify(['hearingEntry', 'internalNotes', 'status']), accountantViolations);
  const editor = mk('staff', oid(), [], [[A, ['cases.edit']]]);
  const editorViolations = forbiddenCaseWrites(editor, current, everything);
  expect('forbiddenCaseWrites: case editor may not touch finance/confidential',
    JSON.stringify(editorViolations.sort()) === JSON.stringify(['caseValue', 'internalNotes', 'paymentEntry']), editorViolations);
  expect('forbiddenCaseWrites: undefined body keys ignored', forbiddenCaseWrites(editor, current, { caseValue: undefined }).length === 0);

  // ── loadAccess ─────────────────────────────────────────────────────────────
  const loaded = await loadAccess({ _id: A, role: 'lawyer' });
  expect('loadAccess: lawyer', loaded.kind === 'lawyer' && loaded.userId === String(A) && !loaded.isSuperAdmin && loaded.firm.size === 0 && loaded.delegations.size === 0);
  expect('loadAccess: admin is super-admin', (await loadAccess({ _id: A, role: 'admin' })).isSuperAdmin);
  const unknown = await loadAccess({ _id: A, role: 'root' });
  expect('loadAccess: unknown role -> least access', unknown.kind === 'client' && !unknown.isSuperAdmin);
  // Staff always read their delegations from the database (Phase 3), so staff
  // loading is checked in endpoints.check.ts

  // ── Phase 2: firm roles ────────────────────────────────────────────────────
  expect('templates: only catalog keys', ROLE_TEMPLATES.every((t) => t.permissions.every((p) => isPermission(p))));
  const template = (name: string) => ROLE_TEMPLATES.find((t) => t.name === name)!.permissions;
  const editorRole = mk('staff', oid(), [...template('Content Editor')]);
  const receptionRole = mk('staff', oid(), [...template('Receptionist')]);
  const accountantRole = mk('staff', oid(), [...template('Accountant')]);
  const managerRole = mk('staff', oid(), [...template('Office Manager')]);
  expect('withImplied: content.publish -> content.edit', editorRole.firm.has('content.edit') && editorRole.firm.has('blogs.manage'));
  expect('withImplied: cases.assign -> cases.edit -> cases.view', ['cases.edit', 'cases.view', 'cases.create'].every((p) => withImplied(['cases.assign']).has(p as Permission)));
  expect('withImplied: appointments.manage -> appointments.view', receptionRole.firm.has('appointments.view'));
  expect('withImplied: clients.manage -> clients.view', managerRole.firm.has('clients.view') && managerRole.firm.has('lawyers.view') && !managerRole.firm.has('lawyers.manage'));
  expect('firm role: applies to every lawyer and without context',
    can(receptionRole, 'appointments.manage', onA) && can(receptionRole, 'appointments.manage', onB) && can(receptionRole, 'appointments.manage'));
  expect('firm role: editor has no case access', !can(editorRole, 'cases.view') && scopeFor(editorRole, 'cases.view') === null);
  expect('firm role: scopeFor -> {} (all lawyers)', JSON.stringify(scopeFor(receptionRole, 'cases.view')) === '{}');
  expect('firm role: canInWorkspace still true for staff', canInWorkspace(receptionRole, 'appointments.manage', onA));
  expect('firm role: never super-admin', !receptionRole.isSuperAdmin && !can(managerRole, 'lawyers.manage'));

  const accountantView = projectCase(full, accountantRole);
  expect('projectCase: accountant role keeps finance, loses confidential', accountantView.caseValue === 1 && !('internalNotes' in accountantView));
  const receptionView = projectCase(full, receptionRole);
  expect('projectCase: receptionist loses finance and confidential', !('payments' in receptionView) && !('internalNotes' in receptionView));

  // Admin case form: extra field families
  const adminCase = { ...current, lawyerId: A, title: 'T', isFeatured: false };
  const moveToB = { lawyerId: String(B) };
  expect('adminForm: reassigning needs cases.assign',
    JSON.stringify(forbiddenCaseWrites(managerRole, adminCase, moveToB, { adminForm: true })) === JSON.stringify(['lawyerId']) &&
    forbiddenCaseWrites(mk('staff', oid(), ['cases.assign']), adminCase, moveToB, { adminForm: true }).length === 0);
  expect('adminForm: unchanged lawyerId (ObjectId vs string) passes',
    forbiddenCaseWrites(accountantRole, adminCase, { lawyerId: String(A), title: 'T' }, { adminForm: true }).length === 0);
  expect('adminForm: title needs cases.edit, isFeatured needs cases.feature',
    JSON.stringify(forbiddenCaseWrites(accountantRole, adminCase, { title: 'New', isFeatured: true }, { adminForm: true }).sort()) === JSON.stringify(['isFeatured', 'title']));
  expect('adminForm: families ignored without the flag', forbiddenCaseWrites(accountantRole, adminCase, moveToB).length === 0);

  // ── Phase 3: delegations ───────────────────────────────────────────────────
  expect('hasAnyAccessTo: delegation for that lawyer only',
    hasAnyAccessTo(staffDelegated, A) && !hasAnyAccessTo(staffDelegated, B) && hasAnyAccessTo(staffDelegated, { _id: A, name: 'A' }));
  expect('hasAnyAccessTo: firm role with a lawyer-scoped key covers every lawyer',
    hasAnyAccessTo(receptionRole, A) && hasAnyAccessTo(receptionRole, oid()));
  expect('hasAnyAccessTo: firm role with firm-only keys covers none', !hasAnyAccessTo(editorRole, A));
  expect('hasAnyAccessTo: lawyer own only, admin all, client none',
    hasAnyAccessTo(lawyerA, A) && !hasAnyAccessTo(lawyerA, B) && hasAnyAccessTo(admin, B) && !hasAnyAccessTo(client, A));
  expect('hiddenFromStaff: only staff without access',
    hiddenFromStaff(staffDelegated, B) && !hiddenFromStaff(staffDelegated, A) && !hiddenFromStaff(lawyerA, B) && !hiddenFromStaff(client, A));
  const cleaned = cleanDelegationPermissions(['cases.view', 'cases.view', 'blogs.manage', 'nope', 'appointments.manage']);
  expect('cleanDelegationPermissions: lawyer-scoped, deduplicated', JSON.stringify(cleaned) === JSON.stringify(['cases.view', 'appointments.manage']), cleaned);
  const delegatedFinance = mk('staff', oid(), [], [[A, ['cases.edit']], [B, ['cases.finance.edit', 'cases.confidential.view']]]);
  expect('delegation: finance and confidential per lawyer',
    !can(delegatedFinance, 'cases.finance.view', onA) && can(delegatedFinance, 'cases.finance.view', onB) &&
    !can(delegatedFinance, 'cases.confidential.edit', onB) && !can(delegatedFinance, 'cases.edit', onB));
  const projectedA = projectCase({ ...full, lawyerId: A }, delegatedFinance);
  const projectedB = projectCase({ ...full, lawyerId: B }, delegatedFinance);
  expect('delegation: projectCase per lawyer',
    !('payments' in projectedA) && !('internalNotes' in projectedA) && 'payments' in projectedB && 'internalNotes' in projectedB);

  console.log(failures ? `\n${failures} FAILED` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})();
