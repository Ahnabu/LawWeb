// The one permission catalog (docs/rbac/README.md §3). Lawyer-scoped keys apply to
// a lawyer's records: a lawyer holds all of them on their own, staff get them per
// lawyer (delegation) or firm-wide (firm role). Firm-only keys come from a firm role.
// Adding a key: give it a label and group here, and a row in tests/access.

export type PermissionGroup = 'Cases' | 'Case finance' | 'Confidential' | 'Appointments' | 'Lawyer profile' | 'Admin areas';

export interface PermissionDef {
  key: string;
  group: PermissionGroup;
  label: string;
  scope: 'lawyer' | 'firm';
  implies?: readonly string[];
}

export const PERMISSIONS = [
  // Lawyer-scoped
  { key: 'cases.view', group: 'Cases', label: 'View cases', scope: 'lawyer' },
  { key: 'cases.create', group: 'Cases', label: 'Create cases', scope: 'lawyer', implies: ['cases.view'] },
  { key: 'cases.edit', group: 'Cases', label: 'Edit cases, hearings and documents', scope: 'lawyer', implies: ['cases.view'] },
  { key: 'cases.archive', group: 'Cases', label: 'Archive and restore cases', scope: 'lawyer', implies: ['cases.view'] },
  { key: 'cases.feature', group: 'Cases', label: 'Feature cases on the public site', scope: 'lawyer', implies: ['cases.view'] },
  { key: 'cases.finance.view', group: 'Case finance', label: 'See fees and payments', scope: 'lawyer', implies: ['cases.view'] },
  { key: 'cases.finance.edit', group: 'Case finance', label: 'Edit fees and record payments', scope: 'lawyer', implies: ['cases.finance.view'] },
  { key: 'cases.confidential.view', group: 'Confidential', label: 'See internal notes, evidence and witnesses', scope: 'lawyer', implies: ['cases.view'] },
  { key: 'cases.confidential.edit', group: 'Confidential', label: 'Edit internal notes, evidence and witnesses', scope: 'lawyer', implies: ['cases.confidential.view'] },
  { key: 'appointments.view', group: 'Appointments', label: 'View appointments', scope: 'lawyer' },
  { key: 'appointments.manage', group: 'Appointments', label: 'Confirm, cancel and complete appointments', scope: 'lawyer', implies: ['appointments.view'] },
  { key: 'availability.manage', group: 'Appointments', label: 'Manage weekly availability', scope: 'lawyer' },
  { key: 'profile.edit', group: 'Lawyer profile', label: 'Edit the public profile and photo', scope: 'lawyer' },
  // Firm-only
  { key: 'dashboard.stats', group: 'Admin areas', label: 'Dashboard statistics', scope: 'firm' },
  { key: 'cases.assign', group: 'Admin areas', label: 'Create cases for any lawyer and reassign cases', scope: 'firm', implies: ['cases.edit', 'cases.create'] },
  { key: 'lawyers.view', group: 'Admin areas', label: 'View lawyers', scope: 'firm' },
  { key: 'lawyers.manage', group: 'Admin areas', label: 'Add, edit, order, verify and remove lawyers', scope: 'firm', implies: ['lawyers.view'] },
  { key: 'clients.view', group: 'Admin areas', label: 'View clients', scope: 'firm' },
  { key: 'clients.manage', group: 'Admin areas', label: 'Edit, block and delete clients', scope: 'firm', implies: ['clients.view'] },
  { key: 'blogs.manage', group: 'Admin areas', label: 'Manage blogs', scope: 'firm' },
  { key: 'content.edit', group: 'Admin areas', label: 'Edit site content drafts', scope: 'firm' },
  { key: 'content.publish', group: 'Admin areas', label: 'Publish site content', scope: 'firm', implies: ['content.edit'] },
  { key: 'messages.manage', group: 'Admin areas', label: 'Contact messages inbox', scope: 'firm' },
  { key: 'audit.view', group: 'Admin areas', label: 'Audit log', scope: 'firm' },
] as const satisfies readonly PermissionDef[];

export type Permission = (typeof PERMISSIONS)[number]['key'];

const BY_KEY: ReadonlyMap<string, PermissionDef> = new Map(PERMISSIONS.map((p) => [p.key, p]));

export const isPermission = (key: string): key is Permission => BY_KEY.has(key);

export const LAWYER_SCOPED: ReadonlySet<Permission> = new Set(
  PERMISSIONS.filter((p) => p.scope === 'lawyer').map((p) => p.key)
);
export const FIRM_ONLY: ReadonlySet<Permission> = new Set(
  PERMISSIONS.filter((p) => p.scope === 'firm').map((p) => p.key)
);
// A lawyer holds every lawyer-scoped key on their own records
export const LAWYER_SELF_PERMISSIONS = LAWYER_SCOPED;

// Expands `implies` transitively. Unknown keys are dropped: stored roles and
// delegations can hold stale keys after a catalog change and must not crash a request.
export const withImplied = (perms: Iterable<string>): Set<Permission> => {
  const out = new Set<Permission>();
  const queue = [...perms];
  while (queue.length) {
    const key = queue.pop() as string;
    if (!isPermission(key) || out.has(key)) continue;
    out.add(key);
    queue.push(...(BY_KEY.get(key)?.implies ?? []));
  }
  return out;
};
