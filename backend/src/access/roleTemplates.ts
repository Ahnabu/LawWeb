import type { Permission } from './permissions';

// Starting points offered by "Start from template" on the Roles page. They only
// pre-fill the form; nothing is stored until the super-admin saves a role.
export interface RoleTemplate {
  name: string;
  description: string;
  permissions: readonly Permission[];
}

export const ROLE_TEMPLATES: readonly RoleTemplate[] = [
  {
    name: 'Content Editor',
    description: 'Writes and publishes blogs and site content.',
    permissions: ['blogs.manage', 'content.publish'],
  },
  {
    name: 'Receptionist',
    description: "Manages every lawyer's appointments and schedule, and the contact inbox.",
    permissions: ['appointments.manage', 'availability.manage', 'cases.view', 'messages.manage'],
  },
  {
    name: 'Accountant',
    description: 'Sees cases and records fees and payments.',
    permissions: ['cases.view', 'cases.finance.edit'],
  },
  {
    name: 'Office Manager',
    description: 'Runs the office day to day: appointments, cases, clients and messages.',
    permissions: ['dashboard.stats', 'appointments.manage', 'cases.edit', 'lawyers.view', 'clients.manage', 'messages.manage', 'audit.view'],
  },
];
