import { describe, expect, it } from 'vitest'
import { adminAreaPermsFor, can, canAny, canOpenAdminArea, hasAdminAreaAccess, isSuperAdmin } from '../lib/access'
import { impliedBy, type CatalogPermission } from '../lib/adminAccess'
import type { AuthUser } from '../lib/auth'

const user = (role: AuthUser['role'], firm: string[] = [], extra: Partial<AuthUser> = {}): AuthUser => ({
  _id: `${role}-1`,
  name: role,
  email: `${role}@example.com`,
  role,
  access: { superAdmin: role === 'admin', firm, delegations: [] },
  ...extra,
})

const admin = user('admin')
const lawyer = user('lawyer')
const client = user('client')
// firm is already expanded by the server (content.publish brings content.edit)
const editor = user('staff', ['blogs.manage', 'content.publish', 'content.edit'])
const noRole = user('staff')

describe('can', () => {
  it('lets the super-admin do everything', () => {
    expect(can(admin, 'audit.view')).toBe(true)
    expect(can(admin, 'cases.finance.edit', 'someone-else')).toBe(true)
  })

  it('gives lawyers lawyer-scoped permissions on their own records only', () => {
    expect(can(lawyer, 'cases.edit', lawyer._id)).toBe(true)
    expect(can(lawyer, 'cases.edit', 'other-lawyer')).toBe(false)
    expect(can(lawyer, 'cases.edit')).toBe(false)
    expect(can(lawyer, 'blogs.manage', lawyer._id)).toBe(false)
  })

  it('gives clients nothing', () => {
    expect(can(client, 'cases.view')).toBe(false)
  })

  it('gives staff their firm permissions and nothing else', () => {
    expect(can(editor, 'blogs.manage')).toBe(true)
    expect(can(editor, 'content.edit')).toBe(true)
    expect(can(editor, 'clients.view')).toBe(false)
    expect(can(noRole, 'blogs.manage')).toBe(false)
  })

  it('applies delegations to the named lawyer only', () => {
    const assistant = user('staff', [], {
      access: { superAdmin: false, firm: [], delegations: [{ lawyerId: 'L1', permissions: ['cases.view'] }] },
    })
    expect(can(assistant, 'cases.view', 'L1')).toBe(true)
    expect(can(assistant, 'cases.view', 'L2')).toBe(false)
    expect(can(assistant, 'cases.view')).toBe(false)
  })

  it('treats a signed-out visitor as having nothing', () => {
    expect(can(null, 'cases.view')).toBe(false)
    expect(isSuperAdmin(undefined)).toBe(false)
  })

  it('canAny needs one match', () => {
    expect(canAny(editor, ['audit.view', 'blogs.manage'])).toBe(true)
    expect(canAny(editor, ['audit.view', 'clients.view'])).toBe(false)
    expect(canAny(editor, [])).toBe(false)
  })
})

describe('admin area', () => {
  it('maps sub-pages to their section', () => {
    expect(adminAreaPermsFor('/dashboard/admin/users/abc')).toEqual(['clients.view'])
    expect(adminAreaPermsFor('/dashboard/admin/content/about')).toEqual(['content.edit'])
    expect(adminAreaPermsFor('/dashboard/admin/team/abc')).toBeNull()
    expect(adminAreaPermsFor('/dashboard/admin')).toEqual(['dashboard.stats'])
    expect(adminAreaPermsFor('/dashboard/admin/unknown')).toBeUndefined()
  })

  it('opens pages by permission; Team, Roles and unknown pages are super-admin only', () => {
    expect(canOpenAdminArea(editor, '/dashboard/admin/blogs')).toBe(true)
    expect(canOpenAdminArea(editor, '/dashboard/admin/users')).toBe(false)
    expect(canOpenAdminArea(editor, '/dashboard/admin/team')).toBe(false)
    expect(canOpenAdminArea(editor, '/dashboard/admin/unknown')).toBe(false)
    expect(canOpenAdminArea(admin, '/dashboard/admin/roles')).toBe(true)
    expect(canOpenAdminArea(admin, '/dashboard/admin/unknown')).toBe(true)
  })

  it('opens Settings for every staff member, even without a role', () => {
    expect(canOpenAdminArea(noRole, '/dashboard/admin/settings')).toBe(true)
    expect(canOpenAdminArea(lawyer, '/dashboard/admin/settings')).toBe(false)
  })

  it('counts only real pages as admin-area access', () => {
    expect(hasAdminAreaAccess(editor)).toBe(true)
    expect(hasAdminAreaAccess(noRole)).toBe(false)
    expect(hasAdminAreaAccess(admin)).toBe(true)
    expect(hasAdminAreaAccess(lawyer)).toBe(false)
    // Lawyer-scoped permissions without a matching admin page open nothing
    expect(hasAdminAreaAccess(user('staff', ['profile.edit']))).toBe(false)
  })
})

describe('impliedBy (role editor)', () => {
  const catalog: CatalogPermission[] = [
    { key: 'cases.view', group: 'Cases', label: 'View cases', scope: 'lawyer', implies: [] },
    { key: 'cases.edit', group: 'Cases', label: 'Edit cases', scope: 'lawyer', implies: ['cases.view'] },
    { key: 'cases.create', group: 'Cases', label: 'Create cases', scope: 'lawyer', implies: ['cases.view'] },
    { key: 'cases.assign', group: 'Admin areas', label: 'Assign', scope: 'firm', implies: ['cases.edit', 'cases.create'] },
    { key: 'content.edit', group: 'Admin areas', label: 'Edit content', scope: 'firm', implies: [] },
    { key: 'content.publish', group: 'Admin areas', label: 'Publish', scope: 'firm', implies: ['content.edit'] },
  ]

  it('expands transitively and names a selected parent', () => {
    const implied = impliedBy(['cases.assign'], catalog)
    expect([...implied.keys()].sort()).toEqual(['cases.create', 'cases.edit', 'cases.view'])
    expect(implied.get('cases.edit')).toBe('cases.assign')
  })

  it('marks a selected permission that another selected one already includes', () => {
    const implied = impliedBy(['content.edit', 'content.publish'], catalog)
    expect(implied.get('content.edit')).toBe('content.publish')
    expect(implied.has('content.publish')).toBe(false)
  })

  it('returns nothing for permissions without implications', () => {
    expect(impliedBy(['cases.view'], catalog).size).toBe(0)
  })
})
