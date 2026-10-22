import mongoose, { Schema, Document } from 'mongoose';

// Append-only record of state-changing actions (sign-ins, admin edits, bookings,
// CMS publishes...). Written through utils/audit.ts, read by admins only.
export const AUDIT_ACTOR_ROLES = ['admin', 'lawyer', 'client', 'staff', 'anonymous', 'system'] as const;
export type AuditActorRole = (typeof AUDIT_ACTOR_ROLES)[number];

export const AUDIT_CATEGORIES = [
  'auth',
  'user',
  'lawyer',
  'case',
  'consultation',
  'blog',
  'content',
  'contact',
  'profile',
  // Roles, staff accounts and lawyer delegations
  'access',
  'system',
] as const;
export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

// Retention: entries are removed by MongoDB's TTL monitor this long after they
// were written. Changing the value needs the old TTL index dropped (or collMod)
// because Mongoose will not alter an existing index's expireAfterSeconds.
export const AUDIT_RETENTION_DAYS = 365;

export interface IAuditLog extends Document {
  actor?: mongoose.Types.ObjectId | null;
  actorName?: string;
  actorEmail?: string;
  actorRole: AuditActorRole;
  action: string;
  category: AuditCategory;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  summary: string;
  // Small and non-sensitive: changed field names, old/new status. Never
  // passwords, tokens or verification codes.
  metadata?: Record<string, unknown>;
  // The lawyer a staff member acted for (RBAC Phase 3); null otherwise
  onBehalfOf?: mongoose.Types.ObjectId | null;
  onBehalfOfName?: string;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, trim: true, maxlength: 200 },
    actorEmail: { type: String, trim: true, lowercase: true, maxlength: 254 },
    actorRole: { type: String, enum: AUDIT_ACTOR_ROLES, required: true, default: 'anonymous' },
    action: { type: String, required: true, trim: true, maxlength: 80 },
    category: { type: String, enum: AUDIT_CATEGORIES, required: true },
    targetType: { type: String, trim: true, maxlength: 50 },
    targetId: { type: String, trim: true, maxlength: 100 },
    targetLabel: { type: String, trim: true, maxlength: 200 },
    summary: { type: String, required: true, trim: true, maxlength: 500 },
    metadata: { type: Schema.Types.Mixed },
    onBehalfOf: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    onBehalfOfName: { type: String, trim: true, maxlength: 200 },
    ip: { type: String, trim: true, maxlength: 100 },
    userAgent: { type: String, trim: true, maxlength: 300 },
  },
  // Entries are never edited, so only createdAt is kept
  { timestamps: { createdAt: true, updatedAt: false }, minimize: true }
);

// TTL index on createdAt doubles as the newest-first sort index for the list.
AuditLogSchema.index({ createdAt: -1 }, { expireAfterSeconds: AUDIT_RETENTION_DAYS * 24 * 60 * 60 });
AuditLogSchema.index({ actor: 1, createdAt: -1 });
AuditLogSchema.index({ category: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
// A lawyer's "Team activity" and the admin "On behalf of" filter
AuditLogSchema.index({ onBehalfOf: 1, createdAt: -1 });

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
