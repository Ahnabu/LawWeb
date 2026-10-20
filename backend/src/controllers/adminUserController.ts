import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Case from '../models/Case';
import Consultation from '../models/Consultation';
import { ACTIVE_STATUSES, businessNow } from '../utils/schedule';
import { revokeAllSessions } from '../utils/session';
import { recordAudit } from '../utils/audit';
import { blockAccount, blockReasonFrom, blockState, unblockAccount } from '../utils/accountBlock';
import { can } from '../access/policy';
import type { Access, AuthedRequest as AuthRequest } from '../access/types';

export const getAllClientsAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [clients, total] = await Promise.all([
      User.find({ role: 'client' })
        .select('name email phone isVerified createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments({ role: 'client' }),
    ]);

    res.json({
      status: 200,
      message: 'Clients retrieved successfully',
      data: clients,
      meta: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (error) {
    console.error('Admin get clients error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

// Public profile fields only: never the password, token hashes or codes
const USER_LIST_FIELDS = 'name email phone role isVerified isBlocked blockedAt createdAt profileImageUrl';
const USER_DETAIL_FIELDS =
  'name email phone role barId specialization isVerified isBlocked blockedAt blockedReason passwordChangedAt profileImageUrl createdAt updatedAt';

const USER_STATUS_FILTERS: Record<string, Record<string, unknown>> = {
  all: {},
  active: { isBlocked: { $ne: true }, isVerified: true },
  blocked: { isBlocked: true },
  unverified: { isBlocked: { $ne: true }, isVerified: { $ne: true } },
};

const SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name: { name: 1, createdAt: -1 },
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toPositiveInt = (value: unknown, fallback: number) => {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const isValidId = (id: unknown): id is string => typeof id === 'string' && mongoose.isValidObjectId(id);

const invalidId = (res: Response) => res.status(400).json({ status: 400, message: 'Invalid user ID' });
const notFound = (res: Response) => res.status(404).json({ status: 404, message: 'User not found' });
const adminRefused = (res: Response, action: string) =>
  res.status(403).json({ status: 403, message: `Admin accounts cannot be ${action} from here.` });
const targetRefused = (res: Response) =>
  res.status(403).json({ status: 403, code: 'FORBIDDEN', message: "You don't have permission to manage this account." });

// clients.* opens these routes; other targets need more. Staff accounts are
// managed by the super-admin only (Team page), lawyers by lawyers.* holders.
const canActOnTarget = (access: Access, targetRole: string, mode: 'view' | 'manage') => {
  if (access.isSuperAdmin) return true;
  if (targetRole === 'client') return true;
  if (targetRole === 'lawyer') return can(access, mode === 'view' ? 'lawyers.view' : 'lawyers.manage');
  return false;
};
// A removed lawyer stays blocked until restored from Lawyer Management
const removedLawyerRefused = (res: Response, name: string) =>
  res.status(409).json({ status: 409, message: `${name} was removed from the firm. Restore them from Lawyer Management first.` });

// ─── List ─────────────────────────────────────────────────────────────────────

// GET /api/admin/users?search=&status=all|active|blocked|unverified&page=&limit=&sort=newest|oldest|name
export const listUsersAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
    const statusKey = typeof req.query.status === 'string' && req.query.status in USER_STATUS_FILTERS ? req.query.status : 'all';
    const sortKey = typeof req.query.sort === 'string' && req.query.sort in SORTS ? req.query.sort : 'newest';
    const limit = Math.min(toPositiveInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);
    const page = toPositiveInt(req.query.page, 1);

    const base: Record<string, unknown> = { role: 'client' };
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      base.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
    }

    const filter = { ...base, ...USER_STATUS_FILTERS[statusKey] };

    // Counts follow the search but not the status tab, so the tabs show what each would hold
    const [users, total, all, active, blocked, unverified] = await Promise.all([
      User.find(filter)
        .select(USER_LIST_FIELDS)
        .sort(SORTS[sortKey])
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
      User.countDocuments(base),
      User.countDocuments({ ...base, ...USER_STATUS_FILTERS.active }),
      User.countDocuments({ ...base, ...USER_STATUS_FILTERS.blocked }),
      User.countDocuments({ ...base, ...USER_STATUS_FILTERS.unverified }),
    ]);

    res.json({
      status: 200,
      message: 'Users retrieved successfully',
      data: users,
      meta: { total, page, limit, counts: { all, active, blocked, unverified } },
    });
  } catch (error) {
    console.error('Admin list users error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// ─── Details ──────────────────────────────────────────────────────────────────

// GET /api/admin/users/:userId — works for clients and lawyers
export const getUserDetailsAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    if (!isValidId(userId)) return invalidId(res);

    const user = await User.findById(userId).select(USER_DETAIL_FIELDS).lean();
    if (!user) return notFound(res);
    if (!canActOnTarget(req.access!, user.role, 'view')) return notFound(res);

    const objectId = new mongoose.Types.ObjectId(userId);
    const isLawyer = user.role === 'lawyer';

    // A client's cases are matched by account or by the email copy on the case
    // (cases created by admins before the client registered carry only the email).
    const caseFilter = isLawyer
      ? { lawyerId: objectId }
      : { $or: [{ clientId: objectId }, { clientEmail: user.email }] };
    const consultationFilter = isLawyer ? { lawyerId: objectId } : { clientId: objectId };

    const [cases, consultations] = await Promise.all([
      Case.find(caseFilter)
        .select('caseNumber title status type isArchived lawyerId clientName clientEmail createdAt')
        .populate('lawyerId', 'name email')
        .sort({ createdAt: -1 })
        .limit(200)
        .lean(),
      Consultation.find(consultationFilter)
        .select('date time status subject consultationType meetingMode lawyerId clientId lawyerConfirmed createdAt')
        .populate('lawyerId', 'name email')
        .populate('clientId', 'name email')
        .sort({ date: -1, time: -1 })
        .limit(200)
        .lean(),
    ]);

    const todayKey = businessNow().dateKey;
    const activeStatuses = ACTIVE_STATUSES as readonly string[];
    const stats = {
      totalCases: cases.length,
      activeCases: cases.filter((c) => !c.isArchived && !['closed', 'won', 'lost', 'settled'].includes(c.status)).length,
      archivedCases: cases.filter((c) => c.isArchived).length,
      totalConsultations: consultations.length,
      upcomingConsultations: consultations.filter(
        (c) => activeStatuses.includes(c.status) && c.date && new Date(c.date).toISOString().slice(0, 10) >= todayKey
      ).length,
      completedConsultations: consultations.filter((c) => c.status === 'completed').length,
      cancelledConsultations: consultations.filter((c) => c.status === 'cancelled').length,
    };

    res.json({
      status: 200,
      message: 'User details retrieved successfully',
      data: { user, cases, consultations, stats },
    });
  } catch (error) {
    console.error('Admin get user details error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// ─── Update ───────────────────────────────────────────────────────────────────

// PATCH /api/admin/users/:userId  body: { name?, phone?, email? }
export const updateUserAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    if (!isValidId(userId)) return invalidId(res);

    const user = await User.findById(userId).select('role email');
    if (!user) return notFound(res);
    if (user.role === 'admin') return adminRefused(res, 'edited');
    if (!canActOnTarget(req.access!, user.role, 'manage')) return targetRefused(res);
    if (user.role !== 'client') {
      // Lawyer edits go through Lawyer Management, which keeps LawyerProfile in sync
      return res.status(400).json({ status: 400, message: 'Edit lawyers from Lawyer Management.' });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const updates: Record<string, string> = {};
    const unset: Record<string, 1> = {};

    if (body.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (name.length < 2 || name.length > 100) {
        return res.status(400).json({ status: 400, message: 'Name must be between 2 and 100 characters.' });
      }
      updates.name = name;
    }

    if (body.phone !== undefined) {
      const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
      if (phone && !/^\+?[\d\s\-()]{6,20}$/.test(phone)) {
        return res.status(400).json({ status: 400, message: 'Please enter a valid phone number.' });
      }
      if (phone) updates.phone = phone;
      else unset.phone = 1;
    }

    if (body.email !== undefined) {
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        return res.status(400).json({ status: 400, message: 'Please enter a valid email address.' });
      }
      if (email !== user.email) {
        const taken = await User.exists({ email, _id: { $ne: user._id } });
        if (taken) {
          return res.status(409).json({ status: 409, message: 'Another account already uses this email address.' });
        }
        updates.email = email;
      }
    }

    if (Object.keys(updates).length === 0 && Object.keys(unset).length === 0) {
      return res.status(400).json({ status: 400, message: 'Nothing to update.' });
    }

    let updated;
    try {
      updated = await User.findByIdAndUpdate(
        userId,
        { ...(Object.keys(updates).length ? { $set: updates } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) },
        { returnDocument: 'after', runValidators: true }
      )
        .select(USER_DETAIL_FIELDS)
        .lean();
    } catch (error) {
      if ((error as { code?: number })?.code === 11000) {
        return res.status(409).json({ status: 409, message: 'Another account already uses this email address.' });
      }
      throw error;
    }

    if (!updated) return notFound(res);

    recordAudit(req, {
      action: 'user.updated',
      category: 'user',
      targetType: 'user',
      targetId: updated._id,
      targetLabel: updated.name,
      summary: `Updated client ${updated.name}`,
      metadata: { fields: [...Object.keys(updates), ...Object.keys(unset)] },
    });

    res.json({ status: 200, message: 'User updated successfully', data: updated });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// ─── Block / unblock ──────────────────────────────────────────────────────────

// PATCH /api/admin/users/:userId/block  body: { reason?: string }
// Works for any non-admin role (clients and lawyers).
export const blockUserAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    if (!isValidId(userId)) return invalidId(res);

    if (req.user?._id && String(req.user._id) === userId) {
      return res.status(400).json({ status: 400, message: 'You cannot block your own account.' });
    }

    const target = await User.findById(userId).select('role name isBlocked deletedAt').lean();
    if (!target) return notFound(res);
    if (target.role === 'admin') return adminRefused(res, 'blocked');
    if (!canActOnTarget(req.access!, target.role, 'manage')) return targetRefused(res);
    if (target.deletedAt) return removedLawyerRefused(res, target.name);

    const reason = blockReasonFrom(req.body);
    const updated = await blockAccount(userId, reason);
    if (!updated) return notFound(res);

    recordAudit(req, {
      action: target.isBlocked ? 'user.block_updated' : 'user.blocked',
      category: 'user',
      targetType: target.role,
      targetId: userId,
      targetLabel: target.name,
      summary: target.isBlocked ? `Updated block on ${target.name}` : `Blocked ${target.role} ${target.name}`,
      metadata: { role: target.role, reason: reason || undefined },
    });

    res.json({
      status: 200,
      message: target.isBlocked
        ? `${target.name}'s block was updated.`
        : `${target.name} has been blocked and signed out of every device.`,
      data: blockState(updated),
    });
  } catch (error) {
    console.error('Admin block user error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// PATCH /api/admin/users/:userId/unblock
export const unblockUserAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    if (!isValidId(userId)) return invalidId(res);

    const target = await User.findById(userId).select('role name isBlocked deletedAt').lean();
    if (!target) return notFound(res);
    if (target.role === 'admin') return adminRefused(res, 'unblocked');
    if (!canActOnTarget(req.access!, target.role, 'manage')) return targetRefused(res);
    if (target.deletedAt) return removedLawyerRefused(res, target.name);

    const updated = await unblockAccount(userId);

    if (!updated) return notFound(res);

    if (target.isBlocked) {
      recordAudit(req, {
        action: 'user.unblocked',
        category: 'user',
        targetType: target.role,
        targetId: userId,
        targetLabel: target.name,
        summary: `Unblocked ${target.role} ${target.name}`,
        metadata: { role: target.role },
      });
    }

    res.json({
      status: 200,
      message: target.isBlocked
        ? `${target.name} has been unblocked and can sign in again.`
        : `${target.name} was not blocked.`,
      data: blockState(updated),
    });
  } catch (error) {
    console.error('Admin unblock user error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// ─── Delete ───────────────────────────────────────────────────────────────────

// DELETE /api/admin/users/:userId — clients only (lawyers have their own flow)
export const deleteUserAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    if (!isValidId(userId)) return invalidId(res);

    const target = await User.findById(userId).select('role name email').lean();
    if (!target) return notFound(res);
    if (target.role === 'admin') return adminRefused(res, 'deleted');
    if (!canActOnTarget(req.access!, target.role, 'manage')) return targetRefused(res);
    if (target.role !== 'client') {
      return res.status(400).json({
        status: 400,
        message: 'Only client accounts can be deleted here. Use Lawyer Management to remove a lawyer.',
      });
    }

    const objectId = new mongoose.Types.ObjectId(userId);

    // Cancel upcoming bookings one by one: save() runs the hook that clears
    // slotKey, which frees the slot for other clients.
    const todayStart = new Date(`${businessNow().dateKey}T00:00:00.000Z`);
    const upcoming = await Consultation.find({
      clientId: objectId,
      status: { $in: ACTIVE_STATUSES },
      date: { $gte: todayStart },
    });
    let cancelledConsultations = 0;
    for (const consultation of upcoming) {
      consultation.status = 'cancelled';
      const note = 'Cancelled automatically: client account was deleted by an administrator.';
      consultation.notes = consultation.notes ? `${consultation.notes}\n${note}` : note;
      // validateModifiedOnly: an old document with a since-tightened field must
      // not abort the deletion halfway; the pre-validate slotKey hook still runs
      await consultation.save({ validateModifiedOnly: true });
      cancelledConsultations += 1;
    }

    // Cases keep their clientName/clientEmail copies; only the account link goes
    const detached = await Case.updateMany({ clientId: objectId }, { $set: { clientId: null } });

    await revokeAllSessions(objectId);
    await User.deleteOne({ _id: objectId });

    recordAudit(req, {
      action: 'user.deleted',
      category: 'user',
      targetType: 'client',
      targetId: userId,
      targetLabel: `${target.name} (${target.email})`,
      summary: `Deleted client account ${target.name}`,
      metadata: { cancelledConsultations, detachedCases: detached.modifiedCount },
    });

    res.json({
      status: 200,
      message: `${target.name}'s account was deleted.`,
      data: {
        _id: objectId,
        cancelledConsultations,
        detachedCases: detached.modifiedCount,
      },
    });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};
