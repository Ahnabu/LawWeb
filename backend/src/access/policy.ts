import { Response } from 'express';
import mongoose from 'mongoose';
import { LAWYER_SCOPED, LAWYER_SELF_PERMISSIONS, Permission } from './permissions';
import type { Access } from './types';

// Every authorization decision goes through here (docs/rbac/README.md §2.2).
// Controllers never compare req.user.role or lawyerId === userId themselves.

// The id behind a ref, whether populated ({ _id, ... }) or raw (ObjectId/string)
export const refId = (ref: unknown): string | null => {
  if (ref == null) return null;
  const value = typeof ref === 'object' && '_id' in (ref as object) ? (ref as { _id: unknown })._id : ref;
  return value == null ? null : String(value);
};

export function can(access: Access, perm: Permission, ctx?: { lawyerId?: unknown }): boolean {
  if (access.isSuperAdmin) return true;
  const lawyerId = refId(ctx?.lawyerId);
  if (access.kind === 'lawyer') {
    return LAWYER_SELF_PERMISSIONS.has(perm) && lawyerId === access.userId;
  }
  if (access.kind === 'staff') {
    if (access.firm.has(perm)) return true;
    return Boolean(lawyerId && access.delegations.get(lawyerId)?.has(perm));
  }
  return false;
}

// Lawyer-side endpoints that admins don't use (they have /api/admin instead):
// confirming or closing a booking, archive/restore by the lawyer, /lawyers/me/*.
export const canInWorkspace = (access: Access, perm: Permission, ctx: { lawyerId?: unknown }): boolean =>
  (access.kind === 'lawyer' || access.kind === 'staff') && can(access, perm, ctx);

// Which lawyers' records a permission covers
export function lawyersFor(access: Access, perm: Permission): 'all' | string[] {
  if (access.isSuperAdmin || access.firm.has(perm)) return 'all';
  if (access.kind === 'lawyer') return LAWYER_SELF_PERMISSIONS.has(perm) ? [access.userId] : [];
  if (access.kind === 'staff') {
    return [...access.delegations].filter(([, perms]) => perms.has(perm)).map(([lawyerId]) => lawyerId);
  }
  return [];
}

// Mongo filter for the records a permission covers: {} = everything, null = nothing
export function scopeFor(access: Access, perm: Permission, field = 'lawyerId'): Record<string, unknown> | null {
  const lawyers = lawyersFor(access, perm);
  if (lawyers === 'all') return {};
  if (!lawyers.length) return null;
  const ids = lawyers.map((id) => new mongoose.Types.ObjectId(id));
  return ids.length === 1 ? { [field]: ids[0] } : { [field]: { $in: ids } };
}

// Any access at all to this lawyer's records: a delegation for them, or a firm
// role with any lawyer-scoped permission. Staff without it get 404, not 403, on
// that lawyer's records (README §4), so they can't learn the record exists.
export function hasAnyAccessTo(access: Access, lawyerId: unknown): boolean {
  if (access.isSuperAdmin) return true;
  const id = refId(lawyerId);
  if (access.kind === 'lawyer') return id === access.userId;
  if (access.kind === 'staff') {
    return [...access.firm].some((p) => LAWYER_SCOPED.has(p)) || Boolean(id && access.delegations.has(id));
  }
  return false;
}

// Staff with no access to the record's lawyer must see 404. Lawyers and clients
// keep their old 403s (Phase 1 behaviour).
export const hiddenFromStaff = (access: Access, lawyerId: unknown): boolean =>
  access.kind === 'staff' && !hasAnyAccessTo(access, lawyerId);

// Client checks stay explicit ("is this my case/booking"); staff are never clients
export const isClientOfCase = (access: Access, caseDoc: { clientId?: unknown }): boolean =>
  access.kind === 'client' && refId(caseDoc.clientId) === access.userId;

export const isClientOfConsultation = (access: Access, consultation: { clientId?: unknown }): boolean =>
  access.kind === 'client' && refId(consultation.clientId) === access.userId;

// 403 body for new checks (README §4). Existing call sites keep their old bodies.
export const forbidden = (
  res: Response,
  message = 'Access denied',
  code: 'FORBIDDEN' | 'FIELD_FORBIDDEN' | 'ADMIN_RESTORE_ONLY' = 'FORBIDDEN',
  extra?: Record<string, unknown>
) => res.status(403).json({ status: 403, message, code, ...extra });
