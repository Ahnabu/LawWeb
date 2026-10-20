import { Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import AuditLog from '../models/AuditLog';
import StaffAssignment from '../models/StaffAssignment';
import { getFrontendUrl } from '../config/env';
import { sendAssistantAddedEmail } from '../utils/email';
import { parsePagination } from '../utils/pagination';
import { recordAudit } from '../utils/audit';
import { grantDelegation, revokeDelegation, updateDelegation } from '../access/delegations';
import { createStaffUser } from './staffController';
import { sendAccountSetupLink } from './authController';
import type { AuthedRequest } from '../access/types';

// A lawyer's assistants ("My Team", mounted at /api/workspace/me/team). Every
// handler acts on the signed-in lawyer's own delegations only, and never shows
// which other lawyers an assistant works for. Accounts themselves (block,
// delete, firm role) stay with the super-admin.

type TeamRequest = AuthedRequest & { workspace: NonNullable<AuthedRequest['workspace']> };

const STAFF_FIELDS = 'name email phone profileImageUrl isBlocked';

const lawyerOf = (req: TeamRequest) => ({ _id: req.workspace.lawyerId, name: req.workspace.lawyerName });

const serverError = (res: Response, label: string, error: unknown) => {
  console.error(`${label} error:`, error);
  res.status(500).json({ status: 500, message: 'Internal server error' });
};

type StaffSummary = { _id: unknown; name: string; email: string; phone?: string; profileImageUrl?: string; isBlocked?: boolean };
const teamRow = (row: { staffId: unknown; permissions: string[]; grantedByRole: string; createdAt: Date; updatedAt: Date }) => {
  const staff = row.staffId as StaffSummary;
  return {
    staffId: staff._id,
    name: staff.name,
    email: staff.email,
    phone: staff.phone ?? null,
    profileImageUrl: staff.profileImageUrl ?? null,
    isBlocked: Boolean(staff.isBlocked),
    permissions: row.permissions,
    grantedByRole: row.grantedByRole,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

const findTeamRow = async (lawyerId: string, staffId: mongoose.Types.ObjectId) => {
  const row = await StaffAssignment.findOne({ lawyerId, staffId }).populate('staffId', STAFF_FIELDS).lean();
  return row?.staffId ? teamRow(row) : null;
};

const notOnTeam = (res: Response) => res.status(404).json({ status: 404, message: 'This person is not on your team' });

// GET /
export const listTeam = async (req: TeamRequest, res: Response) => {
  try {
    const rows = await StaffAssignment.find({ lawyerId: req.workspace.lawyerId })
      .populate('staffId', STAFF_FIELDS)
      .sort({ createdAt: 1 })
      .lean();
    res.json({ status: 200, message: 'Team retrieved successfully', data: rows.filter((r) => r.staffId).map(teamRow) });
  } catch (error) {
    serverError(res, 'List team', error);
  }
};

// POST /  body: { email, name?, phone?, permissions[] } (inviteAssistantSchema)
// Order (account -> delegation -> email) is safe to retry: a repeat finds the
// staff account and carries on.
export const inviteAssistant = async (req: TeamRequest, res: Response) => {
  try {
    const lawyer = lawyerOf(req);
    const { name, phone, permissions } = req.body as { name?: string; phone?: string; permissions: string[] };
    const email = String(req.body.email).trim().toLowerCase();

    type Found = { _id: mongoose.Types.ObjectId; name: string; email: string; role: string; isBlocked?: boolean } | null;
    let staff: Found = await User.findOne({ email }).select('name email role isBlocked').lean();
    let created = false;
    if (!staff) {
      if (!name?.trim()) {
        return res.status(400).json({ status: 400, code: 'NAME_REQUIRED', message: "This email is new to the firm. Enter the assistant's name to create their account." });
      }
      try {
        const user = await createStaffUser({ name, email, phone });
        staff = { _id: user._id, name: user.name, email: user.email, role: 'staff', isBlocked: false };
        created = true;
      } catch (error) {
        if ((error as { code?: number })?.code !== 11000) throw error;
        // Created in the meantime: continue with whatever owns the email now
        staff = await User.findOne({ email }).select('name email role isBlocked').lean();
      }
    }
    if (!staff) return serverError(res, 'Invite assistant', new Error('staff account vanished'));

    if (staff.role !== 'staff') {
      // Don't say what kind of account it is
      return res.status(409).json({ status: 409, code: 'EMAIL_NOT_ASSIGNABLE', message: "This email belongs to an account that can't be added as an assistant." });
    }
    if (staff.isBlocked) {
      return res.status(409).json({ status: 409, code: 'STAFF_BLOCKED', message: "This person's account is blocked. Contact the firm administrator." });
    }

    if (created) {
      recordAudit(req, {
        action: 'staff.created',
        category: 'access',
        targetType: 'staff',
        targetId: staff._id,
        targetLabel: staff.name,
        summary: `Created a staff account for ${staff.name} as ${lawyer.name}'s assistant`,
        metadata: { invitedByLawyer: lawyer._id },
      });
    }

    const row = await grantDelegation(req, { _id: staff._id, name: staff.name }, lawyer, permissions, 'lawyer');
    if (!row) return res.status(409).json({ status: 409, code: 'ALREADY_ASSISTANT', message: `${staff.name} is already your assistant.` });

    let emailSent = true;
    try {
      if (created) await sendAccountSetupLink({ _id: staff._id, name: staff.name, email: staff.email }, 'staff', lawyer.name);
      else await sendAssistantAddedEmail({ email: staff.email, name: staff.name, lawyerName: lawyer.name, dashboardUrl: `${getFrontendUrl()}/dashboard/staff` });
    } catch (error) {
      emailSent = false;
      console.error('Assistant invite email failed:', error);
    }

    res.status(201).json({
      status: 201,
      message: created
        ? emailSent
          ? `${staff.name} was added. We emailed them a link to set their password.`
          : `${staff.name} was added, but the email could not be sent. Ask them to use "Forgot password" on the login page.`
        : `${staff.name} was added to your team.`,
      data: await findTeamRow(req.workspace.lawyerId, staff._id),
      created,
      emailSent,
    });
  } catch (error) {
    serverError(res, 'Invite assistant', error);
  }
};

const teamMember = async (req: TeamRequest) => {
  const { staffId } = req.params;
  if (!mongoose.isValidObjectId(staffId)) return null;
  return User.findOne({ _id: staffId, role: 'staff' }).select('name').lean();
};

// PATCH /:staffId  body: { permissions[] }
export const updateAssistant = async (req: TeamRequest, res: Response) => {
  try {
    const staff = await teamMember(req);
    const updated = staff && (await updateDelegation(req, staff, lawyerOf(req), req.body.permissions, 'lawyer'));
    if (!staff || !updated) return notOnTeam(res);
    res.json({ status: 200, message: `${staff.name}'s permissions were updated.`, data: await findTeamRow(req.workspace.lawyerId, staff._id) });
  } catch (error) {
    serverError(res, 'Update assistant', error);
  }
};

// DELETE /:staffId — ends their access to this lawyer's work; the account stays
export const removeAssistant = async (req: TeamRequest, res: Response) => {
  try {
    const staff = await teamMember(req);
    const removed = staff && (await revokeDelegation(req, staff, lawyerOf(req), 'lawyer'));
    if (!staff || !removed) return notOnTeam(res);
    res.json({ status: 200, message: `${staff.name} no longer has access to your work.`, data: { staffId: staff._id } });
  } catch (error) {
    serverError(res, 'Remove assistant', error);
  }
};

// GET /activity?page=&limit= — what staff did on this lawyer's behalf. Never the
// IP, device or email: the lawyer sees who, what and when.
export const listTeamActivity = async (req: TeamRequest, res: Response) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
    const filter = { onBehalfOf: new mongoose.Types.ObjectId(req.workspace.lawyerId) };
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .select('actor actorName actorRole action category targetType targetId targetLabel summary createdAt')
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);
    res.json({ status: 200, message: 'Team activity retrieved successfully', data: logs, meta: { total, page, limit } });
  } catch (error) {
    serverError(res, 'Team activity', error);
  }
};
