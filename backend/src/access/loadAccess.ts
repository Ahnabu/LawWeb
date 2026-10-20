import Role from '../models/Role';
import type { Access, AccountKind } from './types';
import { withImplied, type Permission } from './permissions';

const KINDS: readonly AccountKind[] = ['admin', 'lawyer', 'client', 'staff'];
const NONE: ReadonlySet<Permission> = new Set();
const NO_DELEGATIONS: ReadonlyMap<string, ReadonlySet<Permission>> = new Map();

// Called by authenticateToken on every request, so permissions are always fresh
// (never put them in the JWT). Phase 3 adds the delegations.
export async function loadAccess(user: { _id: unknown; role?: unknown; staffRoleId?: unknown }): Promise<Access> {
  // An unknown stored role gets the least access, never a guess
  const kind: AccountKind = KINDS.includes(user.role as AccountKind) ? (user.role as AccountKind) : 'client';

  // One indexed read, staff only. No role, or a deleted one, means no access yet.
  let firm: ReadonlySet<Permission> = NONE;
  let firmRoleName: string | null = null;
  if (kind === 'staff' && user.staffRoleId) {
    const role = await Role.findById(user.staffRoleId).select('name permissions').lean();
    firm = withImplied(role?.permissions ?? []);
    firmRoleName = role?.name ?? null;
  }

  return {
    userId: String(user._id),
    kind,
    isSuperAdmin: kind === 'admin',
    firm,
    ...(kind === 'staff' ? { firmRoleName } : {}),
    delegations: NO_DELEGATIONS,
  };
}
