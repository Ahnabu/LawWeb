import mongoose from 'mongoose';
import StaffAssignment from '../models/StaffAssignment';
import { recordAudit } from '../utils/audit';
import { LAWYER_SCOPED, type Permission } from './permissions';
import type { AuthedRequest } from './types';

// Granting, changing and revoking a staff member's access to one lawyer's work.
// Used by the lawyer's "My Team" routes (by: 'lawyer') and the super-admin's
// Team page (by: 'admin'). Each write is one document, so it is safe to retry.

type Party = { _id: mongoose.Types.ObjectId | string; name: string };
export type GrantedBy = 'lawyer' | 'admin';

const isDuplicateKey = (error: unknown) => (error as { code?: number })?.code === 11000;

// Lawyer-scoped keys only, without duplicates (the zod schemas already refuse others)
export const cleanDelegationPermissions = (perms: readonly string[]) =>
  [...new Set(perms)].filter((p) => LAWYER_SCOPED.has(p as Permission));

const auditFields = (staff: Party, lawyer: Party, by: GrantedBy) => ({
  category: 'access' as const,
  targetType: 'staff',
  targetId: staff._id,
  targetLabel: staff.name,
  metadata: { lawyerId: String(lawyer._id), lawyerName: lawyer.name, staffId: String(staff._id), by },
});

// null when the delegation already exists
export const grantDelegation = async (req: AuthedRequest, staff: Party, lawyer: Party, permissions: string[], by: GrantedBy) => {
  const clean = cleanDelegationPermissions(permissions);
  let row;
  try {
    row = await StaffAssignment.create({
      staffId: staff._id,
      lawyerId: lawyer._id,
      permissions: clean,
      grantedBy: req.user._id,
      grantedByRole: by,
    });
  } catch (error) {
    if (isDuplicateKey(error)) return null;
    throw error;
  }

  const fields = auditFields(staff, lawyer, by);
  recordAudit(req, {
    action: 'delegation.granted',
    ...fields,
    summary: by === 'lawyer' ? `Added ${staff.name} as an assistant` : `Gave ${staff.name} access to ${lawyer.name}'s work`,
    metadata: { ...fields.metadata, permissions: clean },
  });
  return row;
};

// null when there is no such delegation
export const updateDelegation = async (req: AuthedRequest, staff: Party, lawyer: Party, permissions: string[], by: GrantedBy) => {
  const clean = cleanDelegationPermissions(permissions);
  const before = await StaffAssignment.findOneAndUpdate(
    { staffId: staff._id, lawyerId: lawyer._id },
    { $set: { permissions: clean } },
    { returnDocument: 'before' }
  ).lean();
  if (!before) return null;

  const added = clean.filter((p) => !before.permissions.includes(p));
  const removed = before.permissions.filter((p) => !clean.includes(p));
  if (added.length || removed.length) {
    const fields = auditFields(staff, lawyer, by);
    recordAudit(req, {
      action: 'delegation.updated',
      ...fields,
      summary: by === 'lawyer'
        ? `Changed what ${staff.name} can do as an assistant`
        : `Changed ${staff.name}'s access to ${lawyer.name}'s work`,
      metadata: { ...fields.metadata, added, removed },
    });
  }
  return StaffAssignment.findById(before._id).lean();
};

// false when there is no such delegation
export const revokeDelegation = async (req: AuthedRequest, staff: Party, lawyer: Party, by: GrantedBy) => {
  const removed = await StaffAssignment.findOneAndDelete({ staffId: staff._id, lawyerId: lawyer._id }).lean();
  if (!removed) return false;

  recordAudit(req, {
    action: 'delegation.revoked',
    ...auditFields(staff, lawyer, by),
    summary: by === 'lawyer' ? `Removed ${staff.name} as an assistant` : `Removed ${staff.name}'s access to ${lawyer.name}'s work`,
  });
  return true;
};
