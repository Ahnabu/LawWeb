import { Request } from 'express';
import mongoose from 'mongoose';
import AuditLog, { AuditActorRole, AuditCategory } from '../models/AuditLog';
import User from '../models/User';
import { refId } from '../access/policy';
import type { ActingFor, AuthedRequest } from '../access/types';

// Who did it. Defaults to req.user; pass explicitly where req.user is not set
// yet (login, register, logout, password reset) or `null` for an anonymous actor.
// With only an id, the name/email/role are looked up in the background.
export type AuditActor = {
  _id?: mongoose.Types.ObjectId | string | null;
  name?: string;
  email?: string;
  role?: AuditActorRole | string;
};

export type AuditEntry = {
  action: string;
  category: AuditCategory;
  summary: string;
  targetType?: string;
  targetId?: unknown;
  targetLabel?: string;
  metadata?: Record<string, unknown>;
  actor?: AuditActor | null;
};

// Keys that must never reach the log, whatever a caller passes in metadata
const SENSITIVE_KEY = /pass(word)?|token|secret|code|hash|otp|cookie|authorization/i;

const clip = (value: unknown, max: number) =>
  value == null || value === '' ? undefined : String(value).slice(0, max);

const sanitize = (value: unknown, depth = 0): unknown => {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.slice(0, 300);
  if (value instanceof Date) return value.toISOString();
  if (value instanceof mongoose.Types.ObjectId) return String(value);
  if (depth >= 3) return undefined;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => sanitize(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>).slice(0, 50)) {
      if (SENSITIVE_KEY.test(key)) continue;
      const clean = sanitize(v, depth + 1);
      if (clean !== undefined) out[key] = clean;
    }
    return out;
  }
  return undefined;
};

const toRole = (role: unknown, hasId: boolean): AuditActorRole => {
  if (role === 'admin' || role === 'lawyer' || role === 'client' || role === 'staff' || role === 'system') return role;
  return hasId ? 'client' : 'anonymous';
};

// Names of the keys whose values differ (loosely compared), for "fields changed" metadata
export const changedFields = (
  before: Record<string, unknown> | null | undefined,
  updates: Record<string, unknown>
) =>
  Object.keys(updates).filter((key) => {
    const prev = before?.[key];
    const next = updates[key];
    if (prev instanceof Date || next instanceof Date) {
      return new Date(prev as string).getTime() !== new Date(next as string).getTime();
    }
    return JSON.stringify(prev ?? null) !== JSON.stringify(next ?? null);
  });

// Single-record handlers (a case, a booking) call this once they know whose
// record it is, so a staff member's action is logged as on behalf of that lawyer.
// The name is filled in from the delegation, or looked up when the entry is written.
export const markActingFor = (req: AuthedRequest, lawyerId: unknown) => {
  if (req.access?.kind !== 'staff') return;
  const id = refId(lawyerId);
  if (!id) return;
  const populatedName = typeof lawyerId === 'object' && lawyerId && 'name' in lawyerId ? (lawyerId as { name?: string }).name : undefined;
  const name = populatedName ?? req.access.delegatedLawyers?.find((l) => l.id === id)?.name;
  req.actingFor = { id, ...(name ? { name } : {}) };
};

const write = async (req: Request | null, entry: AuditEntry) => {
  const reqUser = (req as (Request & { user?: AuditActor }) | null)?.user;
  const actingFor = (req as AuthedRequest | null)?.actingFor as ActingFor | undefined;
  const onBehalfOf = actingFor && mongoose.isValidObjectId(actingFor.id) ? actingFor.id : null;
  let onBehalfOfName = actingFor?.name;
  if (onBehalfOf && !onBehalfOfName) {
    onBehalfOfName = (await User.findById(onBehalfOf).select('name').lean())?.name;
  }
  const given = entry.actor === undefined ? reqUser : entry.actor;
  const actorId = given?._id && mongoose.isValidObjectId(String(given._id)) ? String(given._id) : null;

  let { name, email, role } = given ?? {};
  if (actorId && (!name || !email || !role)) {
    const found = await User.findById(actorId).select('name email role').lean();
    name = name || found?.name;
    email = email || found?.email;
    role = role || found?.role;
  }

  await AuditLog.create({
    actor: actorId,
    actorName: clip(name, 200),
    actorEmail: clip(email, 254),
    actorRole: toRole(role, Boolean(actorId)),
    action: entry.action,
    category: entry.category,
    targetType: clip(entry.targetType, 50),
    targetId: clip(entry.targetId, 100),
    targetLabel: clip(entry.targetLabel, 200),
    summary: clip(entry.summary, 500) ?? entry.action,
    metadata: entry.metadata ? (sanitize(entry.metadata) as Record<string, unknown>) : undefined,
    ...(onBehalfOf ? { onBehalfOf, onBehalfOfName: clip(onBehalfOfName, 200) } : {}),
    // req.ip honours the "trust proxy" setting from server.ts (X-Forwarded-For)
    ip: clip(req?.ip, 100),
    userAgent: clip(req?.headers?.['user-agent'], 300),
  });
};

// Fire-and-forget: never throws, never delays or fails the request.
export const recordAudit = (req: Request | null, entry: AuditEntry): void => {
  try {
    write(req, entry).catch((error) => console.error(`Audit log (${entry.action}) failed:`, error));
  } catch (error) {
    console.error(`Audit log (${entry.action}) failed:`, error);
  }
};
