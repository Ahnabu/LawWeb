import { Request } from 'express';
import type { Permission } from './permissions';

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
  // lawyerId -> permissions delegated for that lawyer (Phase 3); empty otherwise.
  // Only active lawyers appear: a blocked or removed lawyer's delegations are suspended.
  delegations: ReadonlyMap<string, ReadonlySet<Permission>>;
  // The lawyers behind `delegations`, for names in audit entries and the UI (staff only)
  delegatedLawyers?: readonly DelegatedLawyer[];
}

export interface DelegatedLawyer {
  id: string;
  name: string;
  profileImageUrl?: string;
}

// The lawyer a staff member is acting for, recorded as onBehalfOf in the audit log
export interface ActingFor {
  id: string;
  name?: string;
}

export interface AuthedRequest extends Request {
  user?: any; // unchanged shape, kept for the existing controllers
  access?: Access;
  // Set by resolveWorkspace (routes/workspace.ts)
  workspace?: { lawyerId: string; lawyerName: string };
  // Set for staff by resolveWorkspace or markActingFor; read by recordAudit
  actingFor?: ActingFor;
}
