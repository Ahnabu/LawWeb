import mongoose from 'mongoose';
import { can } from './policy';
import type { Permission } from './permissions';
import type { Access } from './types';

export const CASE_FINANCE_FIELDS = ['caseValue', 'retainerAmount', 'estimatedFee', 'retainerPaid', 'totalPayment', 'payments'] as const;
export const CASE_CONFIDENTIAL_FIELDS = ['internalNotes', 'evidenceSummary', 'witnessNames'] as const;

// Lawyer/firm-only fields that must never reach a client
const CLIENT_HIDDEN_FIELDS = ['internalNotes', 'archiveNote', 'archivedBy'] as const;

// A Case document or a plain object
type CaseLike = { toObject?: () => unknown; lawyerId?: unknown };

// What this actor may see of a case (a document or a plain object)
export function projectCase(caseObj: CaseLike, access: Access): Record<string, any> {
  const data = (typeof caseObj.toObject === 'function' ? caseObj.toObject() : { ...caseObj }) as Record<string, any>;

  if (access.kind === 'client') {
    for (const field of CLIENT_HIDDEN_FIELDS) delete data[field];
    if (data.formerLawyer) data.formerLawyer = { name: data.formerLawyer.name };
    return data;
  }

  const ctx = { lawyerId: data.lawyerId };
  if (!can(access, 'cases.finance.view', ctx)) for (const field of CASE_FINANCE_FIELDS) delete data[field];
  if (!can(access, 'cases.confidential.view', ctx)) for (const field of CASE_CONFIDENTIAL_FIELDS) delete data[field];
  return data;
}

// May this actor PATCH the case at all? An accountant with only finance.edit can
// still record payments; forbiddenCaseWrites() then limits which fields.
export const canWriteCase = (access: Access, lawyerId: unknown): boolean =>
  can(access, 'cases.edit', { lawyerId }) ||
  can(access, 'cases.finance.edit', { lawyerId }) ||
  can(access, 'cases.confidential.edit', { lawyerId });

const GENERAL_WRITE_FIELDS = [
  'status', 'stage', 'priority', 'notes', 'nextCourtDate', 'courtName', 'jurisdiction',
  'opposingParty', 'opposingCounsel', 'statute', 'referredBy', 'caseOrigin',
  'clientPhone', 'clientWhatsapp', 'hearingEntry', 'documentEntry',
] as const;
const FINANCE_WRITE_FIELDS = [...CASE_FINANCE_FIELDS, 'paymentEntry'] as const;

// Fields only the admin case form (PATCH /api/admin/cases/:id) can change
const ADMIN_FORM_FAMILIES: readonly [readonly string[], Permission][] = [
  [['type', 'title', 'description', 'clientId', 'clientEmail', 'clientName', 'isOnline', 'filingDate'], 'cases.edit'],
  [['isFeatured'], 'cases.feature'],
  // Moving a case to another lawyer is a firm decision
  [['lawyerId'], 'cases.assign'],
];

// Appending an entry is always a change; other fields only when the value differs
const APPEND_FIELDS = new Set(['hearingEntry', 'documentEntry', 'paymentEntry']);

const isEmpty = (v: unknown) => v === undefined || v === null || v === '';
const normalize = (v: unknown): string => {
  if (isEmpty(v)) return '';
  if (v instanceof Date) return String(v.getTime());
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}(T|$)/.test(v) && !Number.isNaN(Date.parse(v))) return String(Date.parse(v));
  if (v instanceof mongoose.Types.ObjectId) return String(v);
  if (typeof v === 'object' && '_id' in (v as object)) return String((v as { _id: unknown })._id);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};
const sameValue = (current: unknown, next: unknown) => normalize(current) === normalize(next);

// Body keys this actor may not change on this case. Values equal to the current
// ones are not violations: the case pages send unchanged fields back.
// `adminForm` adds the fields only the admin case form edits.
export function forbiddenCaseWrites(
  access: Access,
  caseDoc: CaseLike,
  body: Record<string, unknown>,
  { adminForm = false }: { adminForm?: boolean } = {}
): string[] {
  if (access.isSuperAdmin) return [];
  const ctx = { lawyerId: caseDoc.lawyerId };
  const families: [readonly string[], boolean][] = [
    [GENERAL_WRITE_FIELDS, can(access, 'cases.edit', ctx)],
    [FINANCE_WRITE_FIELDS, can(access, 'cases.finance.edit', ctx)],
    [CASE_CONFIDENTIAL_FIELDS, can(access, 'cases.confidential.edit', ctx)],
    ...(adminForm ? ADMIN_FORM_FAMILIES.map(([fields, perm]) => [fields, can(access, perm, ctx)] as [readonly string[], boolean]) : []),
  ];

  const violations: string[] = [];
  for (const [fields, allowed] of families) {
    if (allowed) continue;
    for (const field of fields) {
      if (body[field] === undefined) continue;
      const current = (caseDoc as Record<string, unknown>)[field];
      const changes = APPEND_FIELDS.has(field) ? Boolean(body[field]) : !sameValue(current, body[field]);
      if (changes) violations.push(field);
    }
  }
  return violations;
}
