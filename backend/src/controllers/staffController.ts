import { Request, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import User from '../models/User';
import Role from '../models/Role';
import Session from '../models/Session';
import StaffAssignment from '../models/StaffAssignment';
import { parsePagination } from '../utils/pagination';
import { recordAudit } from '../utils/audit';
import { revokeAllSessions } from '../utils/session';
import { blockAccount, blockReasonFrom, blockState, unblockAccount } from '../utils/accountBlock';
import { ACCOUNT_SETUP_EXPIRY_HOURS, sendAccountSetupLink } from './authController';
import { grantDelegation, revokeDelegation, updateDelegation } from '../access/delegations';
import type { AuthedRequest } from '../access/types';

// Staff accounts (super-admin only, see routes/admin.ts). Staff are firm
// employees with one firm role and any number of lawyer delegations; they never
// become clients, lawyers or admins.

type AuthRequest = AuthedRequest & Request;

const STAFF_FIELDS = 'name email phone role staffRoleId isVerified isBlocked blockedAt blockedReason createdAt updatedAt';

const STATUS_FILTERS: Record<string, Record<string, unknown>> = {
  all: {},
  active: { isBlocked: { $ne: true } },
  blocked: { isBlocked: true },
};

const ACCOUNT_KIND_LABELS: Record<string, string> = {
  admin: 'an administrator',
  lawyer: 'a lawyer',
  client: 'a client',
  staff: 'a staff member',
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const notFound = (res: Response) => res.status(404).json({ status: 404, message: 'Staff member not found' });
const roleMissing = (res: Response) => res.status(400).json({ status: 400, message: 'That role no longer exists.' });

const findStaff = (staffId: unknown, fields = STAFF_FIELDS) =>
  typeof staffId === 'string' && mongoose.isValidObjectId(staffId)
    ? User.findOne({ _id: staffId, role: 'staff' }).select(fields).lean()
    : null;

const loadStaff = (staffId: unknown) =>
  User.findById(staffId).select(STAFF_FIELDS).populate('staffRoleId', 'name permissions').lean();

// A new staff account: a random password nobody knows, and the owner sets their
// own through the emailed setup link. Also used when a lawyer invites an assistant.
// Throws the duplicate-key error if the email was taken in the meantime.
export const createStaffUser = (fields: { name: string; email: string; phone?: string; staffRoleId?: mongoose.Types.ObjectId | null }) =>
  User.create({
    name: fields.name.trim(),
    email: fields.email,
    password: crypto.randomBytes(32).toString('hex'),
    role: 'staff',
    phone: fields.phone?.trim() || undefined,
    staffRoleId: fields.staffRoleId ?? null,
    isVerified: true,
    passwordNeedsChange: false,
  });

// Every lawyer this staff member assists. A blocked or removed lawyer shows as
// inactive: the delegation is kept and works again once the lawyer is restored.
const delegationsOf = async (staffId: unknown) => {
  const rows = await StaffAssignment.find({ staffId: String(staffId) })
    .populate('lawyerId', 'name role isBlocked deletedAt')
    .populate('grantedBy', 'name')
    .sort({ createdAt: 1 })
    .lean();
  return rows.flatMap((row) => {
    const lawyer = row.lawyerId as unknown as { _id: unknown; name: string; role: string; isBlocked?: boolean; deletedAt?: Date | null } | null;
    if (!lawyer) return [];
    return [{
      lawyerId: lawyer._id,
      lawyerName: lawyer.name,
      lawyerActive: lawyer.role === 'lawyer' && !lawyer.isBlocked && !lawyer.deletedAt,
      permissions: row.permissions,
      grantedByRole: row.grantedByRole,
      grantedByName: (row.grantedBy as unknown as { name?: string } | null)?.name ?? null,
      updatedAt: row.updatedAt,
    }];
  });
};

// Most recent activity on any signed-in device (sessions expire, so it can be empty)
const lastActiveByUser = async (ids: mongoose.Types.ObjectId[]) => {
  if (!ids.length) return new Map<string, Date>();
  const rows = await Session.aggregate<{ _id: mongoose.Types.ObjectId; at: Date }>([
    { $match: { userId: { $in: ids } } },
    { $group: { _id: '$userId', at: { $max: '$lastUsedAt' } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.at]));
};

// GET /api/admin/staff?search=&status=all|active|blocked&page=&limit=
export const listStaffAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
    const statusKey = typeof req.query.status === 'string' && req.query.status in STATUS_FILTERS ? req.query.status : 'all';
    const { page, limit, skip } = parsePagination(req.query);

    const base: Record<string, unknown> = { role: 'staff' };
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      base.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
    }
    const filter = { ...base, ...STATUS_FILTERS[statusKey] };

    // Counts follow the search but not the status tab
    const [staff, total, all, active, blocked] = await Promise.all([
      User.find(filter)
        .select(STAFF_FIELDS)
        .populate('staffRoleId', 'name')
        .sort({ name: 1, _id: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
      User.countDocuments(base),
      User.countDocuments({ ...base, ...STATUS_FILTERS.active }),
      User.countDocuments({ ...base, ...STATUS_FILTERS.blocked }),
    ]);

    const lastActive = await lastActiveByUser(staff.map((s) => s._id));
    res.json({
      status: 200,
      message: 'Staff retrieved successfully',
      data: staff.map((s) => ({ ...s, lastActiveAt: lastActive.get(String(s._id)) ?? null })),
      meta: { total, page, limit, counts: { all, active, blocked } },
    });
  } catch (error) {
    console.error('Admin list staff error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// POST /api/admin/staff  body: { name, email, phone?, staffRoleId? } (validated by createStaffSchema)
// Like adding a lawyer: a random password nobody knows plus an emailed setup link.
export const createStaffAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, phone, staffRoleId } = req.body as { name: string; email: string; phone?: string; staffRoleId?: string | null };
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await User.findOne({ email: normalizedEmail }).select('role').lean();
    if (existing) {
      return res.status(409).json({
        status: 409,
        message: `This email already belongs to ${ACCOUNT_KIND_LABELS[existing.role] ?? 'another account'}. Each person needs their own email address.`,
      });
    }

    const role = staffRoleId ? await Role.findById(staffRoleId).select('name').lean() : null;
    if (staffRoleId && !role) return roleMissing(res);

    let staff;
    try {
      staff = await createStaffUser({ name, email: normalizedEmail, phone, staffRoleId: role?._id });
    } catch (error) {
      if ((error as { code?: number })?.code === 11000) {
        return res.status(409).json({ status: 409, message: 'This email already belongs to another account.' });
      }
      throw error;
    }

    let emailSent = true;
    try {
      await sendAccountSetupLink(staff, 'staff');
    } catch (error) {
      emailSent = false;
      console.error('Staff setup email failed:', error);
    }

    recordAudit(req, {
      action: 'staff.created',
      category: 'access',
      targetType: 'staff',
      targetId: staff._id,
      targetLabel: staff.name,
      summary: `Added staff member ${staff.name}${role ? ` as ${role.name}` : ''}`,
      metadata: { role: role?.name ?? null, setupEmailSent: emailSent },
    });

    res.status(201).json({
      status: 201,
      message: emailSent
        ? `Staff account created. A link to set their password was emailed to ${normalizedEmail} (valid ${ACCOUNT_SETUP_EXPIRY_HOURS} hours).`
        : 'Staff account created, but the setup email could not be sent. Ask them to use "Forgot password" on the login page.',
      data: await loadStaff(staff._id),
      emailSent,
    });
  } catch (error) {
    console.error('Admin create staff error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// GET /api/admin/staff/:staffId
export const getStaffDetailsAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const found = await findStaff(req.params.staffId, '_id');
    if (!found) return notFound(res);
    const [staff, lastActive, delegations] = await Promise.all([
      loadStaff(found._id),
      lastActiveByUser([found._id]),
      delegationsOf(found._id),
    ]);
    if (!staff) return notFound(res);
    res.json({
      status: 200,
      message: 'Staff member retrieved successfully',
      data: { ...staff, lastActiveAt: lastActive.get(String(found._id)) ?? null, delegations },
    });
  } catch (error) {
    console.error('Admin get staff error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// PATCH /api/admin/staff/:staffId  body: { name?, phone?, staffRoleId? (null clears) }
export const updateStaffAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const before = await findStaff(req.params.staffId, 'name phone staffRoleId');
    if (!before) return notFound(res);
    const { name, phone, staffRoleId } = req.body as { name?: string; phone?: string; staffRoleId?: string | null };

    const set: Record<string, unknown> = {};
    const unset: Record<string, 1> = {};
    if (name !== undefined) set.name = name.trim();
    if (phone !== undefined) {
      if (phone.trim()) set.phone = phone.trim();
      else unset.phone = 1;
    }

    let fromRole: string | null = null;
    let toRole: string | null = null;
    const roleChanged = staffRoleId !== undefined && String(staffRoleId ?? '') !== String(before.staffRoleId ?? '');
    if (roleChanged) {
      const target = staffRoleId ? await Role.findById(staffRoleId).select('name').lean() : null;
      if (staffRoleId && !target) return roleMissing(res);
      const previous = before.staffRoleId ? await Role.findById(before.staffRoleId).select('name').lean() : null;
      fromRole = previous?.name ?? null;
      toRole = target?.name ?? null;
      set.staffRoleId = target?._id ?? null;
    }

    if (!Object.keys(set).length && !Object.keys(unset).length) {
      return res.json({ status: 200, message: 'Nothing changed', data: await loadStaff(before._id) });
    }

    await User.updateOne(
      { _id: before._id, role: 'staff' },
      { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { runValidators: true }
    );
    const staff = await loadStaff(before._id);
    if (!staff) return notFound(res);

    const detailFields = [...Object.keys(set), ...Object.keys(unset)].filter((f) => f !== 'staffRoleId');
    if (detailFields.length) {
      recordAudit(req, {
        action: 'staff.updated',
        category: 'access',
        targetType: 'staff',
        targetId: staff._id,
        targetLabel: staff.name,
        summary: `Updated staff member ${staff.name}`,
        metadata: { fields: detailFields },
      });
    }
    if (roleChanged) {
      recordAudit(req, {
        action: 'staff.role_changed',
        category: 'access',
        targetType: 'staff',
        targetId: staff._id,
        targetLabel: staff.name,
        summary: `Changed ${staff.name}'s role from ${fromRole ?? 'no role'} to ${toRole ?? 'no role'}`,
        metadata: { from: fromRole, to: toRole },
      });
    }

    res.json({ status: 200, message: 'Staff member updated', data: staff });
  } catch (error) {
    console.error('Admin update staff error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// PATCH /api/admin/staff/:staffId/block  body: { reason? }
export const blockStaffAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const target = await findStaff(req.params.staffId, 'name isBlocked');
    if (!target) return notFound(res);
    const reason = blockReasonFrom(req.body);

    const updated = await blockAccount(target._id, reason);
    if (!updated) return notFound(res);

    recordAudit(req, {
      action: target.isBlocked ? 'staff.block_updated' : 'staff.blocked',
      category: 'access',
      targetType: 'staff',
      targetId: target._id,
      targetLabel: target.name,
      summary: target.isBlocked ? `Updated block on ${target.name}` : `Blocked staff member ${target.name}`,
      metadata: { reason: reason || undefined },
    });

    res.json({
      status: 200,
      message: target.isBlocked
        ? `${target.name}'s block was updated.`
        : `${target.name} has been blocked and signed out of every device.`,
      data: blockState(updated),
    });
  } catch (error) {
    console.error('Admin block staff error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// PATCH /api/admin/staff/:staffId/unblock
export const unblockStaffAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const target = await findStaff(req.params.staffId, 'name isBlocked');
    if (!target) return notFound(res);

    const updated = await unblockAccount(target._id);
    if (!updated) return notFound(res);

    if (target.isBlocked) {
      recordAudit(req, {
        action: 'staff.unblocked',
        category: 'access',
        targetType: 'staff',
        targetId: target._id,
        targetLabel: target.name,
        summary: `Unblocked staff member ${target.name}`,
      });
    }

    res.json({
      status: 200,
      message: target.isBlocked ? `${target.name} has been unblocked and can sign in again.` : `${target.name} was not blocked.`,
      data: blockState(updated),
    });
  } catch (error) {
    console.error('Admin unblock staff error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// DELETE /api/admin/staff/:staffId — hard delete. Audit entries keep the actor's
// name, so their history stays readable. Delegations go first, so a retry after
// a failure in between still finds the account and finishes.
export const deleteStaffAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const target = await findStaff(req.params.staffId, 'name email');
    if (!target) return notFound(res);

    await revokeAllSessions(target._id);
    await StaffAssignment.deleteMany({ staffId: target._id });
    await User.deleteOne({ _id: target._id, role: 'staff' });

    recordAudit(req, {
      action: 'staff.deleted',
      category: 'access',
      targetType: 'staff',
      targetId: target._id,
      targetLabel: `${target.name} (${target.email})`,
      summary: `Deleted staff account ${target.name}`,
    });

    res.json({ status: 200, message: `${target.name}'s account was deleted.`, data: { _id: target._id } });
  } catch (error) {
    console.error('Admin delete staff error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// ── Lawyers a staff member assists (super-admin) ──────────────────────────────

const delegationParties = async (staffId: unknown, lawyerId: unknown) => {
  const staff = await findStaff(staffId, 'name');
  const lawyer = typeof lawyerId === 'string' && mongoose.isValidObjectId(lawyerId)
    ? await User.findOne({ _id: lawyerId, role: 'lawyer' }).select('name').lean()
    : null;
  return { staff, lawyer };
};

// POST /api/admin/staff/:staffId/delegations  body: { lawyerId, permissions[] }
export const grantDelegationAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { staff, lawyer } = await delegationParties(req.params.staffId, req.body.lawyerId);
    if (!staff) return notFound(res);
    if (!lawyer) return res.status(404).json({ status: 404, message: 'Lawyer not found' });

    const row = await grantDelegation(req, staff, lawyer, req.body.permissions, 'admin');
    if (!row) {
      return res.status(409).json({ status: 409, message: `${staff.name} already assists ${lawyer.name}. Edit their permissions instead.` });
    }
    res.status(201).json({ status: 201, message: `${staff.name} now assists ${lawyer.name}`, data: await delegationsOf(staff._id) });
  } catch (error) {
    console.error('Admin grant delegation error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// PATCH /api/admin/staff/:staffId/delegations/:lawyerId  body: { permissions[] }
export const updateDelegationAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { staff, lawyer } = await delegationParties(req.params.staffId, req.params.lawyerId);
    if (!staff) return notFound(res);
    const updated = lawyer && (await updateDelegation(req, staff, lawyer, req.body.permissions, 'admin'));
    if (!updated) return res.status(404).json({ status: 404, message: `${staff.name} doesn't assist this lawyer` });
    res.json({ status: 200, message: 'Permissions updated', data: await delegationsOf(staff._id) });
  } catch (error) {
    console.error('Admin update delegation error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// DELETE /api/admin/staff/:staffId/delegations/:lawyerId
export const revokeDelegationAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { staff, lawyer } = await delegationParties(req.params.staffId, req.params.lawyerId);
    if (!staff) return notFound(res);
    const revoked = lawyer && (await revokeDelegation(req, staff, lawyer, 'admin'));
    if (!revoked) return res.status(404).json({ status: 404, message: `${staff.name} doesn't assist this lawyer` });
    res.json({ status: 200, message: `${staff.name} no longer assists ${lawyer.name}`, data: await delegationsOf(staff._id) });
  } catch (error) {
    console.error('Admin revoke delegation error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};
