import { Request, Response } from 'express';
import AuditLog, { AUDIT_ACTOR_ROLES, AUDIT_CATEGORIES, AUDIT_RETENTION_DAYS } from '../models/AuditLog';
import { auditLogQueryFields, formatZodIssues } from '../middleware/validation';
import { parsePagination, toCountMap } from '../utils/pagination';

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/admin/audit-logs?page=&limit=&category=&action=&actorRole=&actor=&search=&from=&to=
// Newest first. `actor` (a user id) gives one user's trail, as on the user detail page.
export const listAuditLogsAdmin = async (req: Request, res: Response) => {
  try {
    const parsed = auditLogQueryFields.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ status: 400, message: 'Validation failed', errors: formatZodIssues(parsed.error) });
    }
    const q = parsed.data;
    const { page, limit, skip } = parsePagination({ page: q.page, limit: q.limit }, { defaultLimit: 25 });

    const filter: Record<string, unknown> = {};
    if (q.category && q.category !== 'all') filter.category = q.category;
    if (q.action) filter.action = q.action;
    if (q.actorRole) filter.actorRole = q.actorRole;
    if (q.actor) filter.actor = q.actor;
    if (q.from || q.to) {
      filter.createdAt = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lte: q.to } : {}) };
    }
    if (q.search) {
      const pattern = new RegExp(escapeRegex(q.search), 'i');
      filter.$or = [
        { summary: pattern },
        { actorName: pattern },
        { actorEmail: pattern },
        { targetLabel: pattern },
        { action: pattern },
        { ip: pattern },
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      status: 200,
      message: 'Audit logs retrieved successfully',
      data: logs,
      meta: { total, page, limit },
    });
  } catch (error) {
    console.error('Admin list audit logs error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// GET /api/admin/audit-logs/meta — values for the filter dropdowns
export const getAuditLogMetaAdmin = async (_req: Request, res: Response) => {
  try {
    const [actions, byCategory] = await Promise.all([
      AuditLog.distinct('action'),
      AuditLog.aggregate<{ _id: string; n: number }>([{ $group: { _id: '$category', n: { $sum: 1 } } }]),
    ]);

    res.json({
      status: 200,
      message: 'Audit log filters retrieved successfully',
      data: {
        categories: AUDIT_CATEGORIES,
        actorRoles: AUDIT_ACTOR_ROLES,
        actions: (actions as string[]).sort(),
        categoryCounts: toCountMap(byCategory),
        retentionDays: AUDIT_RETENTION_DAYS,
      },
    });
  } catch (error) {
    console.error('Admin audit log meta error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};
