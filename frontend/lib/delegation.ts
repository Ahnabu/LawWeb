import { LAWYER_SCOPED } from './access'

// What an assistant may do for a lawyer (a delegation). The checkboxes come from
// the catalog (/api/access/catalog `delegable`); these helpers only label them.

// Mirrors the lawyer-scoped `implies` in backend/src/access/permissions.ts
const IMPLIES: Record<string, readonly string[]> = {
  'cases.create': ['cases.view'],
  'cases.edit': ['cases.view'],
  'cases.archive': ['cases.view'],
  'cases.feature': ['cases.view'],
  'cases.finance.view': ['cases.view'],
  'cases.finance.edit': ['cases.finance.view'],
  'cases.confidential.view': ['cases.view'],
  'cases.confidential.edit': ['cases.confidential.view'],
  'appointments.manage': ['appointments.view'],
}

export function expandLawyerPermissions(perms: readonly string[]): Set<string> {
  const out = new Set<string>()
  const queue = [...perms]
  while (queue.length) {
    const key = queue.pop()!
    if (out.has(key)) continue
    out.add(key)
    queue.push(...(IMPLIES[key] ?? []))
  }
  return out
}

// They only pre-tick boxes; what is saved is the boxes
export const DELEGATION_PRESETS: { key: string; label: string; description: string; permissions: readonly string[] }[] = [
  { key: 'scheduling', label: 'Scheduling', description: 'Appointments and availability', permissions: ['appointments.manage', 'availability.manage'] },
  { key: 'cases', label: 'Case assistant', description: 'Appointments, and creating and editing cases', permissions: ['appointments.manage', 'cases.create', 'cases.edit'] },
  { key: 'full', label: 'Full access', description: 'Everything, including fees and confidential notes', permissions: LAWYER_SCOPED },
]

// Shown next to the checkboxes that reveal sensitive case data
export const SENSITIVE_PERMISSION_WARNINGS: Record<string, string> = {
  'cases.finance.view': 'Lets this assistant see fees and payments.',
  'cases.confidential.view': 'Lets this assistant see internal notes, evidence and witnesses.',
}

// "Appointments, Cases (edit), Finance (view)": one short line per area
export function summarizePermissions(perms: readonly string[]): string {
  const p = expandLawyerPermissions(perms)
  const parts: string[] = []
  if (p.has('appointments.manage')) parts.push('Appointments')
  else if (p.has('appointments.view')) parts.push('Appointments (view)')
  if (p.has('availability.manage')) parts.push('Availability')
  if (p.has('cases.view')) {
    const verbs = [
      p.has('cases.create') && 'create',
      p.has('cases.edit') && 'edit',
      p.has('cases.archive') && 'archive',
      p.has('cases.feature') && 'feature',
    ].filter(Boolean)
    parts.push(verbs.length ? `Cases (${verbs.join(', ')})` : 'Cases (view)')
  }
  if (p.has('cases.finance.edit')) parts.push('Finance (edit)')
  else if (p.has('cases.finance.view')) parts.push('Finance (view)')
  if (p.has('cases.confidential.edit')) parts.push('Confidential (edit)')
  else if (p.has('cases.confidential.view')) parts.push('Confidential (view)')
  if (p.has('profile.edit')) parts.push('Public profile')
  return parts.join(', ') || 'No access'
}
