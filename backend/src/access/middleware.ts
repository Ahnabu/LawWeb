import { Response, NextFunction } from 'express';
import { can } from './policy';
import type { Permission } from './permissions';
import type { AccountKind, AuthedRequest } from './types';

// Route gates; run after authenticateToken. The 401/403 bodies match the old
// authorizeRoles() so the frontend's handling is unchanged.
const gate = (allowed: (req: AuthedRequest & { access: NonNullable<AuthedRequest['access']> }) => boolean) =>
  (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.access) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!allowed(req as AuthedRequest & { access: NonNullable<AuthedRequest['access']> })) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };

export const requireSuperAdmin = gate((req) => req.access.isSuperAdmin);

// Account-type gate (e.g. lawyer-only workspace routes)
export const requireKind = (...kinds: AccountKind[]) => gate((req) => kinds.includes(req.access.kind));

// Firm-level gate with no lawyer context: super-admin or a firm role holding perm
export const requirePermission = (perm: Permission) => gate((req) => can(req.access, perm));

// Firm-level gate satisfied by any one of the permissions
export const requireAnyPermission = (...perms: Permission[]) =>
  gate((req) => perms.some((perm) => can(req.access, perm)));
