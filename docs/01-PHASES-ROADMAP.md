# Development Phases

## Phase 1: Foundation (✅ Completed)

- User registration and login (client-only; lawyers added by admin)
- Email verification with OTP
- Design system setup (Material Design 3 tokens)
- Language support (i18n — Bengali/English)
- Navbar and Footer

---

## Phase 2: Public Pages (✅ Completed)

**Completed**: May 7, 2026

### Tasks

- [x] Home page (hero, stats, practice areas, lawyer cards, success stories, CTA)
- [ ] About Us page
- [x] Lawyers listing page (search filter, real API data)
- [ ] Lawyer details page
- [ ] Appointment form with WhatsApp link

### Notes

- Lawyer cards now fetch from `/api/lawyers/public` — no dummy data
- Home page lawyer section wired to real API
- About Us and Lawyer Details pages still pending

---

## Phase 3: Dashboards (✅ Completed — Admin; 🔄 Client/Lawyer In Progress)

**Completed**: May 7, 2026

### Admin Dashboard (✅ Done)

- [x] Sidebar toggle visible on all screen sizes (collapsible on desktop)
- [x] Appointments page — view all, filter by status, inline status update
- [x] Cases page — view all, filter by status, add new case modal, inline status update
- [x] Lawyers management — add lawyer (creates account, default password `123456`), verify/revoke verification, remove
- [x] Users page — paginated client list with table layout
- [x] Stats overview (total cases, active cases, lawyers, clients, today's appointments)

### Lawyer Dashboard (🔄 In Progress)

- [ ] View assigned appointments
- [ ] View assigned cases
- [ ] Manage availability
- [ ] Profile management

### Client Dashboard (🔄 In Progress)

- [ ] View booked appointments
- [ ] View case status
- [ ] Book consultation
- [ ] Profile management

---

## Phase 4: Lawyer Management & Security (✅ Completed)

**Completed**: May 7, 2026

### Tasks

- [x] Remove public lawyer sign-up — lawyers added by admin only
- [x] Admin creates lawyer account with role `lawyer`, default password `123456`
- [x] `passwordNeedsChange: true` flag on created accounts
- [x] Mandatory password change modal on first dashboard login
- [x] Two API endpoints: `/api/lawyers/public` (limited — name, barId, specialization) and `/api/lawyers` (full, authenticated)
- [x] `POST /api/auth/change-password` endpoint

---

## Phase 5: Case Management (🔄 In Progress)

**Target**: May 20, 2026

### Tasks

- [x] Admin can create cases (online & offline) with client email, client name, lawyer assignment
- [x] Admin can update case status (active, filed, hearing-scheduled, under-review, closed, won, lost)
- [ ] Client can view their cases in dashboard
- [ ] Lawyer can view assigned cases in dashboard
- [ ] Case details page (individual case view)
- [ ] Email notifications for case status updates

---

## Phase 6: Appointment Booking & Client Flow (⏭️ Planned)

**Target**: June 1, 2026

### Tasks

- [ ] Public appointment booking form (date, time, subject, description)
- [ ] WhatsApp integration link on appointment confirmation
- [ ] Client can view and cancel booked appointments
- [ ] Lawyer can view upcoming appointments and update status
- [ ] Conflict detection (no double-booking same lawyer slot)

---

## Current Sprint (Sprint 2)

**Status**: In Progress
**Duration**: May 7 – May 20, 2026

### Goals

1. ✅ Admin dashboard fully functional (appointments, cases, lawyers, users)
2. ✅ Lawyer account creation flow (admin adds, forced password change)
3. ✅ Public pages wired to real API (home + lawyers list)
4. ✅ Sidebar toggle fixed (all screen sizes)
5. 🔄 Client dashboard — real data integration
6. 🔄 Lawyer dashboard — real data integration
7. ⏭️ Lawyer details page
8. ⏭️ About Us page
9. ⏭️ Appointment booking form (public)

### Blockers

- None currently
