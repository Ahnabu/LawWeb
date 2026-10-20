import Role from '../models/Role';
import User from '../models/User';
import StaffAssignment from '../models/StaffAssignment';
import LawyerProfile from '../models/LawyerProfile';
import type { Access, AccountKind, DelegatedLawyer } from './types';
import { LAWYER_SCOPED, withImplied, type Permission } from './permissions';

const KINDS: readonly AccountKind[] = ['admin', 'lawyer', 'client', 'staff'];
const NONE: ReadonlySet<Permission> = new Set();
const NO_DELEGATIONS: ReadonlyMap<string, ReadonlySet<Permission>> = new Map();

// A delegation counts only while its lawyer is active, so blocking or removing a
// lawyer suspends their assistants' access and restoring them brings it back.
export const ACTIVE_LAWYER_FILTER = { role: 'lawyer' as const, deletedAt: null, isBlocked: { $ne: true } };

// Staff only: their delegations, then which of those lawyers are active (and their photos)
const loadDelegations = async (staffId: unknown) => {
  const rows = await StaffAssignment.find({ staffId: String(staffId) }).select('lawyerId permissions').lean();
  if (!rows.length) return { delegations: NO_DELEGATIONS, delegatedLawyers: [] as DelegatedLawyer[] };

  const ids = rows.map((r) => r.lawyerId);
  // The photo lives on the lawyer profile; read in parallel, so no extra round trip
  const [lawyers, profiles] = await Promise.all([
    User.find({ _id: { $in: ids }, ...ACTIVE_LAWYER_FILTER }).select('name profileImageUrl').sort({ name: 1 }).lean(),
    LawyerProfile.find({ userId: { $in: ids } }).select('userId profileImageUrl').lean(),
  ]);
  const photoOf = new Map(profiles.map((p) => [String(p.userId), p.profileImageUrl]));
  const permsByLawyer = new Map(rows.map((r) => [String(r.lawyerId), r.permissions]));

  const delegations = new Map<string, ReadonlySet<Permission>>();
  const delegatedLawyers: DelegatedLawyer[] = [];
  for (const lawyer of lawyers) {
    const id = String(lawyer._id);
    // Only lawyer-scoped keys can be delegated; anything else stored is ignored
    const perms = new Set([...withImplied(permsByLawyer.get(id) ?? [])].filter((p) => LAWYER_SCOPED.has(p)));
    delegations.set(id, perms);
    const photo = photoOf.get(id) || lawyer.profileImageUrl;
    delegatedLawyers.push({ id, name: lawyer.name, ...(photo ? { profileImageUrl: photo } : {}) });
  }
  return { delegations, delegatedLawyers };
};

// Called by authenticateToken on every request, so permissions are always fresh
// (never put them in the JWT).
export async function loadAccess(user: { _id: unknown; role?: unknown; staffRoleId?: unknown }): Promise<Access> {
  // An unknown stored role gets the least access, never a guess
  const kind: AccountKind = KINDS.includes(user.role as AccountKind) ? (user.role as AccountKind) : 'client';

  if (kind !== 'staff') {
    return { userId: String(user._id), kind, isSuperAdmin: kind === 'admin', firm: NONE, delegations: NO_DELEGATIONS };
  }

  // No role, or a deleted one, means no firm access
  const [role, { delegations, delegatedLawyers }] = await Promise.all([
    user.staffRoleId ? Role.findById(user.staffRoleId).select('name permissions').lean() : null,
    loadDelegations(user._id),
  ]);

  return {
    userId: String(user._id),
    kind,
    isSuperAdmin: false,
    firm: role ? withImplied(role.permissions ?? []) : NONE,
    firmRoleName: role?.name ?? null,
    delegations,
    delegatedLawyers,
  };
}
