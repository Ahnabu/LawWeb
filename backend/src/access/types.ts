import { Request } from 'express';
import type { Permission } from './permissions';

// 'staff' is listed now so Phases 2-3 don't change the type; nothing produces it yet
export type AccountKind = 'admin' | 'lawyer' | 'client' | 'staff';

// What the current actor may do, resolved once per request by loadAccess()
export interface Access {
  userId: string;
  kind: AccountKind;
  isSuperAdmin: boolean;
  // Staff firm role (Phase 2); empty otherwise
  firm: ReadonlySet<Permission>;
  // Name of that firm role, for display only (staff only; null without a role)
  firmRoleName?: string | null;
  // lawyerId -> permissions delegated for that lawyer (Phase 3); empty otherwise
  delegations: ReadonlyMap<string, ReadonlySet<Permission>>;
}

export interface AuthedRequest extends Request {
  user?: any; // unchanged shape, kept for the existing controllers
  access?: Access;
}
