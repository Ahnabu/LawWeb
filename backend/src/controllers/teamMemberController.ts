import { Response } from 'express';
import mongoose from 'mongoose';
import TeamMember from '../models/TeamMember';
import { recordAudit } from '../utils/audit';
import { parsePagination } from '../utils/pagination';
import type { AuthedRequest } from '../access/types';

// The administrative and support staff shown on the public "Our Team" page,
// below the lawyers. These are public profiles, not login accounts: adding one
// here never creates a staff account and grants no access to the dashboard.

type AuthRequest = AuthedRequest;

const PUBLIC_FIELDS = 'name role photoUrl phone email bio sortOrder';

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const notFound = (res: Response) => res.status(404).json({ status: 404, message: 'Team member not found' });

const serverError = (res: Response, label: string, error: unknown) => {
  console.error(`${label} error:`, error);
  res.status(500).json({ status: 500, message: 'Internal server error' });
};

// New members go to the end of the public order
const nextSortOrder = async () => {
  const last = await TeamMember.findOne().sort({ sortOrder: -1 }).select('sortOrder').lean();
  return (last?.sortOrder ?? -1) + 1;
};

/** Public: the visible team, in display order. */
export const listPublicTeamMembers = async (_req: AuthRequest, res: Response) => {
  try {
    const members = await TeamMember.find({ isVisible: true })
      .select(PUBLIC_FIELDS)
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    res.json({
      status: 200,
      message: 'Team retrieved successfully',
      data: members,
    });
  } catch (error) {
    serverError(res, 'List public team members', error);
  }
};

/** Admin: every member, visible or not, with search and paging. */
export const listTeamMembersAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 200 });
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';

    const filter: Record<string, unknown> = {};
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ name: pattern }, { role: pattern }, { email: pattern }, { phone: pattern }];
    }

    const [members, total, visible] = await Promise.all([
      TeamMember.find(filter)
        .select(`${PUBLIC_FIELDS} isVisible createdAt updatedAt`)
        .sort({ sortOrder: 1, name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TeamMember.countDocuments(filter),
      TeamMember.countDocuments({ isVisible: true }),
    ]);

    res.json({
      status: 200,
      message: 'Team retrieved successfully',
      data: members,
      meta: { total, page, limit, counts: { all: total, visible } },
    });
  } catch (error) {
    serverError(res, 'List team members', error);
  }
};

export const getTeamMemberAdmin = async (req: AuthRequest, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.memberId)) return notFound(res);
    const member = await TeamMember.findById(req.params.memberId).lean();
    if (!member) return notFound(res);
    res.json({ status: 200, message: 'Team member retrieved successfully', data: member });
  } catch (error) {
    serverError(res, 'Get team member', error);
  }
};

export const createTeamMemberAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { name, role, photoUrl, phone, email, bio, isVisible } = req.body as {
      name: string;
      role: string;
      photoUrl?: string;
      phone?: string;
      email?: string;
      bio?: string;
      isVisible?: boolean;
    };

    const member = await TeamMember.create({
      name: name.trim(),
      role: role.trim(),
      photoUrl: photoUrl?.trim() || '',
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      bio: bio?.trim() || '',
      isVisible: isVisible ?? true,
      sortOrder: await nextSortOrder(),
    });

    recordAudit(req, {
      action: 'team.created',
      category: 'content',
      targetType: 'team',
      targetId: member._id,
      targetLabel: member.name,
      summary: `Added ${member.name} to the public team page`,
      metadata: { role: member.role, isVisible: member.isVisible },
    });

    res.status(201).json({ status: 201, message: 'Team member added', data: member });
  } catch (error) {
    serverError(res, 'Create team member', error);
  }
};

export const updateTeamMemberAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { memberId } = req.params;
    if (!mongoose.isValidObjectId(memberId)) return notFound(res);

    const member = await TeamMember.findById(memberId);
    if (!member) return notFound(res);

    const body = (req.body ?? {}) as Record<string, unknown>;
    if (body.name !== undefined) member.name = String(body.name).trim();
    if (body.role !== undefined) member.role = String(body.role).trim();
    if (body.photoUrl !== undefined) member.photoUrl = String(body.photoUrl).trim();
    if (body.phone !== undefined) member.phone = String(body.phone).trim();
    if (body.email !== undefined) member.email = String(body.email).trim().toLowerCase();
    if (body.bio !== undefined) member.bio = String(body.bio).trim();
    if (body.isVisible !== undefined) member.isVisible = Boolean(body.isVisible);

    const changed = member.modifiedPaths().filter((p) => !p.includes('.'));
    await member.save();

    recordAudit(req, {
      action: 'team.updated',
      category: 'content',
      targetType: 'team',
      targetId: member._id,
      targetLabel: member.name,
      summary: `Updated ${member.name} on the public team page`,
      metadata: { fields: changed },
    });

    res.json({ status: 200, message: 'Team member updated', data: member });
  } catch (error) {
    serverError(res, 'Update team member', error);
  }
};

/** PUT /api/admin/team-members/order  { order: string[] } — ids, first to last. */
export const reorderTeamMembersAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const order = req.body?.order;
    if (!Array.isArray(order) || order.length === 0 || !order.every((id) => typeof id === 'string')) {
      return res.status(400).json({ status: 400, message: 'order must be a non-empty array of team member IDs' });
    }
    if (new Set(order).size !== order.length) {
      return res.status(400).json({ status: 400, message: 'order contains duplicate IDs' });
    }

    const members = await TeamMember.find().select('_id').sort({ sortOrder: 1, name: 1 }).lean();
    const known = new Set(members.map((m) => String(m._id)));
    const unknown = (order as string[]).filter((id) => !known.has(id));
    if (unknown.length) {
      return res.status(400).json({
        status: 400,
        message: 'Some IDs are not team members (the list may be out of date). Reload and try again.',
      });
    }

    const listed = new Set(order as string[]);
    const finalOrder = [
      ...(order as string[]),
      ...members.map((m) => String(m._id)).filter((id) => !listed.has(id)),
    ];

    await TeamMember.bulkWrite(
      finalOrder.map((id, index) => ({
        updateOne: { filter: { _id: id }, update: { $set: { sortOrder: index } } },
      }))
    );

    recordAudit(req, {
      action: 'team.reordered',
      category: 'content',
      targetType: 'team',
      summary: `Reordered ${finalOrder.length} team members on the public site`,
      metadata: { count: finalOrder.length },
    });

    res.json({
      status: 200,
      message: 'Team order saved.',
      data: finalOrder.map((id, index) => ({ _id: id, sortOrder: index })),
    });
  } catch (error) {
    serverError(res, 'Reorder team members', error);
  }
};

export const deleteTeamMemberAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { memberId } = req.params;
    if (!mongoose.isValidObjectId(memberId)) return notFound(res);

    const member = await TeamMember.findByIdAndDelete(memberId).lean();
    if (!member) return notFound(res);

    recordAudit(req, {
      action: 'team.deleted',
      category: 'content',
      targetType: 'team',
      targetId: member._id,
      targetLabel: member.name,
      summary: `Removed ${member.name} from the public team page`,
    });

    res.json({ status: 200, message: 'Team member removed', data: { _id: member._id } });
  } catch (error) {
    serverError(res, 'Delete team member', error);
  }
};
