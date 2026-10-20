import { describe, expect, it } from 'vitest'
import { can } from '../lib/access'
import type { AuthUser } from '../lib/auth'
import { canLawyerRestore } from '../lib/cases'
import { DELEGATION_PRESETS, expandLawyerPermissions, summarizePermissions } from '../lib/delegation'
import {
  parseStaffWorkspacePath,
  workspaceHomeFor,
  workspacePageFor,
  workspacePagesFor,
} from '../components/lawyer-workspace/workspacePages'

// Delegations arrive expanded from the server
const assistant: AuthUser = {
  _id: 'S1',
  name: 'Sara',
  email: 'sara@example.com',
  role: 'staff',
  access: {
    superAdmin: false,
    firm: [],
    delegations: [
      { lawyerId: 'A', lawyerName: 'Adv. A', permissions: ['cases.edit', 'cases.view', 'appointments.manage', 'appointments.view'] },
      { lawyerId: 'B', lawyerName: 'Adv. B', permissions: ['availability.manage'] },
    ],
  },
}

describe('delegated permissions', () => {
  it('apply per lawyer', () => {
    expect(can(assistant, 'cases.edit', 'A')).toBe(true)
    expect(can(assistant, 'cases.edit', 'B')).toBe(false)
    expect(can(assistant, 'availability.manage', 'B')).toBe(true)
    expect(can(assistant, 'cases.finance.view', 'A')).toBe(false)
  })
})

describe('summarizePermissions', () => {
  it('expands implied permissions', () => {
    expect([...expandLawyerPermissions(['cases.finance.edit'])].sort()).toEqual(['cases.finance.edit', 'cases.finance.view', 'cases.view'])
  })

  it('describes each area once', () => {
    expect(summarizePermissions(['appointments.manage', 'availability.manage'])).toBe('Appointments, Availability')
    expect(summarizePermissions(['cases.edit', 'cases.finance.view'])).toBe('Cases (edit), Finance (view)')
    expect(summarizePermissions(['appointments.view'])).toBe('Appointments (view)')
    expect(summarizePermissions([])).toBe('No access')
  })

  it('has presets made of lawyer-scoped keys only', () => {
    const full = DELEGATION_PRESETS.find((p) => p.key === 'full')!
    expect(full.permissions).toHaveLength(13)
    expect(summarizePermissions(full.permissions)).toContain('Confidential (edit)')
  })
})

describe('staff workspace pages', () => {
  it('parses workspace paths', () => {
    expect(parseStaffWorkspacePath('/dashboard/staff/lawyers/A')).toEqual({ lawyerId: 'A', subPath: '' })
    expect(parseStaffWorkspacePath('/dashboard/staff/lawyers/A/cases/c1')).toEqual({ lawyerId: 'A', subPath: '/cases/c1' })
    expect(parseStaffWorkspacePath('/dashboard/staff')).toBeNull()
  })

  it('maps case details to the Cases page', () => {
    expect(workspacePageFor('/cases/c1')?.path).toBe('/cases')
    expect(workspacePageFor('')?.path).toBe('')
    expect(workspacePageFor('/unknown')).toBeUndefined()
  })

  it('lists only the pages the delegation allows, and lands on the first', () => {
    expect(workspacePagesFor(assistant, 'A').map((p) => p.label)).toEqual(['Overview', 'Appointments', 'Cases'])
    expect(workspacePagesFor(assistant, 'B').map((p) => p.label)).toEqual(['Availability'])
    expect(workspaceHomeFor(assistant, 'B')).toBe('/dashboard/staff/lawyers/B/availability')
  })
})

describe('canLawyerRestore', () => {
  const archived = { isArchived: true, archiveReason: 'manual' as const }

  it('allows what the lawyer side archived', () => {
    expect(canLawyerRestore({ ...archived, archiveOrigin: 'lawyer', archivedBy: 'S1' }, 'A')).toBe(true)
  })

  it('refuses what the firm archived', () => {
    expect(canLawyerRestore({ ...archived, archiveOrigin: 'firm', archivedBy: 'A' }, 'A')).toBe(false)
    expect(canLawyerRestore({ isArchived: true, archiveReason: 'lawyer-deleted', archiveOrigin: 'firm' }, 'A')).toBe(false)
  })

  it('falls back to who archived it on older cases', () => {
    expect(canLawyerRestore({ ...archived, archivedBy: { _id: 'A', name: 'Adv. A' } }, 'A')).toBe(true)
    expect(canLawyerRestore({ ...archived, archivedBy: 'admin-1' }, 'A')).toBe(false)
  })
})
