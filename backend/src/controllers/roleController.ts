import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Role, { roleNameKey } from '../models/Role';
import User from '../models/User';
import { isPermission } from '../access/permissions';
import { recordAudit } from '../utils/audit';

// Firm roles (super-admin only, see routes/admin.ts). A role's permissions are
// read on every request by loadAccess, so edits apply to its staff immediately.

interface AuthRequest extends Request {
  user?: any;
}

const isDuplicateKeyError = (error: unknown) => (error as { code?: number })?.code === 11000;
const notFound = (res: Response) => res.status(404).json({ status: 404, message: 'Role not found' });
const duplicateName = (res: Response, name: string) =>
  res.status(409).json({ status: 409, message: `A role named "${name}" already exists.` });

// Unknown keys are refused here (stale keys in stored roles are tolerated at load time)
const unknownPermissions = (permissions: string[]) => permissions.filter((key) => !isPermission(key));

// roleId -> number of staff holding it
const staffCounts = async (roleIds: mongoose.Types.ObjectId[]) => {
  const rows = await User.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
    { $match: { role: 'staff', staffRoleId: { $in: roleIds } } },
    { $group: { _id: '$staffRoleId', n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.n]));
};

// GET /api/admin/roles
export const listRolesAdmin = async (_req: AuthRequest, res: Response) => {
  try {
    const roles = await Role.find().sort({ name: 1 }).lean();
    const counts = await staffCounts(roles.map((r) => r._id));
    res.json({
      status: 200,
      message: 'Roles retrieved successfully',
      data: roles.map((role) => ({ ...role, staffCount: counts.get(String(role._id)) ?? 0 })),
    });
  } catch (error) {
    console.error('Admin list roles error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// POST /api/admin/roles  body: { name, description?, permissions[] } (validated by createRoleSchema)
export const createRoleAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, permissions } = req.body as { name: string; description?: string; permissions: string[] };
    const unknown = unknownPermissions(permissions);
    if (unknown.length) {
      return res.status(400).json({ status: 400, message: `Unknown permissions: ${unknown.join(', ')}`, unknown });
    }

    let role;
    try {
      role = await Role.create({
        name: name.trim(),
        nameKey: roleNameKey(name),
        description: description?.trim() || undefined,
        permissions: [...new Set(permissions)],
        createdBy: req.user?._id ?? null,
        updatedBy: req.user?._id ?? null,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) return duplicateName(res, name.trim());
      throw error;
    }

    recordAudit(req, {
      action: 'role.created',
      category: 'access',
      targetType: 'role',
      targetId: role._id,
      targetLabel: role.name,
      summary: `Created role ${role.name}`,
      metadata: { permissions: role.permissions },
    });

    res.status(201).json({ status: 201, message: 'Role created', data: { ...role.toObject(), staffCount: 0 } });
  } catch (error) {
    console.error('Admin create role error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// PATCH /api/admin/roles/:roleId  body: { name?, description?, permissions? }
export const updateRoleAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { roleId } = req.params;
    if (!mongoose.isValidObjectId(roleId)) return notFound(res);
    const { name, description, permissions } = req.body as { name?: string; description?: string; permissions?: string[] };

    if (permissions) {
      const unknown = unknownPermissions(permissions);
      if (unknown.length) {
        return res.status(400).json({ status: 400, message: `Unknown permissions: ${unknown.join(', ')}`, unknown });
      }
    }

    const existing = await Role.findById(roleId).lean();
    if (!existing) return notFound(res);

    const updates: Record<string, unknown> = { updatedBy: req.user?._id ?? null };
    if (name !== undefined) Object.assign(updates, { name: name.trim(), nameKey: roleNameKey(name) });
    if (description !== undefined) updates.description = description.trim();
    if (permissions !== undefined) updates.permissions = [...new Set(permissions)];

    let role;
    try {
      role = await Role.findByIdAndUpdate(roleId, { $set: updates }, { returnDocument: 'after', runValidators: true }).lean();
    } catch (error) {
      if (isDuplicateKeyError(error)) return duplicateName(res, String(name).trim());
      throw error;
    }
    if (!role) return notFound(res);

    const before = new Set(existing.permissions);
    const after = new Set(role.permissions);
    const added = role.permissions.filter((p) => !before.has(p));
    const removed = existing.permissions.filter((p) => !after.has(p));
    recordAudit(req, {
      action: 'role.updated',
      category: 'access',
      targetType: 'role',
      targetId: role._id,
      targetLabel: role.name,
      summary: existing.name === role.name ? `Updated role ${role.name}` : `Updated role ${existing.name} (now ${role.name})`,
      metadata: {
        ...(added.length ? { added } : {}),
        ...(removed.length ? { removed } : {}),
        ...(existing.name !== role.name ? { renamedFrom: existing.name } : {}),
      },
    });

    const counts = await staffCounts([role._id]);
    res.json({ status: 200, message: 'Role updated', data: { ...role, staffCount: counts.get(String(role._id)) ?? 0 } });
  } catch (error) {
    console.error('Admin update role error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// DELETE /api/admin/roles/:roleId?reassignTo=<roleId|none>
// A role in use is only deleted once its staff have somewhere to go. The staff
// move first, then the role goes; repeating an interrupted call is safe.
export const deleteRoleAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { roleId } = req.params;
    if (!mongoose.isValidObjectId(roleId)) return notFound(res);
    const reassignTo = typeof req.query.reassignTo === 'string' ? req.query.reassignTo : '';

    const role = await Role.findById(roleId).select('name').lean();
    if (!role) return notFound(res);

    const staffCount = await User.countDocuments({ role: 'staff', staffRoleId: role._id });
    let target: { _id: mongoose.Types.ObjectId; name: string } | null = null;
    if (staffCount > 0) {
      if (!reassignTo) {
        return res.status(409).json({
          status: 409,
          code: 'ROLE_IN_USE',
          message: `${staffCount} staff member${staffCount === 1 ? ' has' : 's have'} this role. Choose a role to move them to.`,
          staffCount,
        });
      }
      if (reassignTo !== 'none') {
        if (!mongoose.isValidObjectId(reassignTo) || reassignTo === String(role._id)) {
          return res.status(400).json({ status: 400, message: 'Choose a different role to move the staff to.' });
        }
        target = await Role.findById(reassignTo).select('name').lean();
        if (!target) return res.status(400).json({ status: 400, message: 'The role to move the staff to no longer exists.' });
      }
      await User.updateMany({ role: 'staff', staffRoleId: role._id }, { $set: { staffRoleId: target?._id ?? null } });
    }

    await Role.deleteOne({ _id: role._id });

    recordAudit(req, {
      action: 'role.deleted',
      category: 'access',
      targetType: 'role',
      targetId: role._id,
      targetLabel: role.name,
      summary: staffCount
        ? `Deleted role ${role.name}; ${staffCount} staff moved to ${target ? target.name : 'no role'}`
        : `Deleted role ${role.name}`,
      metadata: staffCount ? { staffMoved: staffCount, movedTo: target?.name ?? null } : undefined,
    });

    res.json({ status: 200, message: `Role ${role.name} deleted`, data: { _id: role._id, staffMoved: staffCount } });
  } catch (error) {
    console.error('Admin delete role error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};
