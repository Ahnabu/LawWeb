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

## Phase 3: Dashboards (✅ Completed)

**Completed**: May 8, 2026

### Admin Dashboard (✅ Done)

- [x] Sidebar toggle visible on all screen sizes (collapsible on desktop)
- [x] Appointments page — view all, filter by status, inline status update
- [x] Cases page — view all, filter by status, add new case modal, inline status update
- [x] Lawyers management — add lawyer (creates account, default password `123456`), verify/revoke verification, remove
- [x] Users page — paginated client list with table layout
- [x] Stats overview (total cases, active cases, lawyers, clients, today's appointments)

### Lawyer Dashboard (✅ Done)

- [x] Appointments page — compact table, status filter tabs, "View Details" modal, mark complete/cancel
- [x] Cases page — compact table, status filter tabs, "Add Case" modal, star to feature/unfeature
- [x] Case Detail page — full case info, update status and notes, feature toggle
- [x] Availability page — weekly schedule editor, accepting-new-clients toggle (routing bug fixed)
- [x] Profile page — bilingual fields, practice areas, languages, education, certifications, hourly rate
- [x] Profile image upload — Cloudinary via multer, old image deleted on re-upload
- [x] All page titles use `h3`

### Client Dashboard (✅ Done)

- [x] View booked appointments — tabular format, status filter tabs, detail modal, cancel button
- [x] View case status — tabular format, status filter tabs, detail modal with full case info
- [x] Book consultation — clean dashboard-integrated form, sonner toasts, redirects to appointments
- [x] Profile management — view/edit name & phone, Cloudinary photo upload

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
- [x] Lawyer can create their own cases (previously admin-only)
- [x] Extended schema: `priority`, `courtName`, `jurisdiction`, `opposingParty`, `opposingCounsel`, `filingDate`, `isFeatured`
- [x] New statuses: `settled`, `appealed`; new types: `labor`, `tax`, `constitutional`, `environmental`
- [x] Lawyer case detail page — full view, status update, notes, feature toggle
- [x] `PATCH /api/cases/:id/toggle-featured` endpoint
- [x] Client can view their cases in dashboard
- [ ] Email notifications for case status updates

---

## Phase 6: Appointment Booking & Client Flow (✅ Completed)

**Completed**: May 8, 2026

### Tasks

- [x] Public appointment booking form (date, time, subject, description, lawyer select)
- [x] WhatsApp integration link on lawyer details page
- [x] Client can view and cancel booked appointments (tabular + modal)
- [x] Lawyer can view upcoming appointments and update status
- [x] Conflict detection (no double-booking same lawyer slot — backend enforced)

---

## Phase 6: UX & DX Polish (✅ Completed)

**Completed**: May 8, 2026

### Tasks

- [x] Sonner toast notifications — installed, wired across all lawyer dashboard pages (loading/success/error)
- [x] Theme toggle button (Sun/Moon) in dashboard topbar — respects `ThemeProvider`, persists in localStorage
- [x] Bar-wave loading animation — replaces "Loading..." on dashboard auth check; CSS `@keyframes` in `globals.css`, `will-change: transform`
- [x] Image upload response trimmed — only `{ profileImageUrl }` returned, no full profile object in network tab
- [x] `dotenv` load-order fix — `backend/src/config/env.ts` imported first in `server.ts` so Cloudinary credentials are available before any module initialises
- [x] JWT access token expiry — increased from 15 min to 3 days; cookie `maxAge` updated to match
- [x] Nodemon auto-restart — `exec: ts-node --transpile-only`, `delay: 500` in `nodemon.json`
- [x] Express route ordering — all `/me/*` routes before `/:lawyerId` in `lawyers.ts` (fixes CastError on availability)

---

## Current Sprint (Sprint 3)

**Status**: In Progress
**Duration**: May 8 – May 20, 2026

### Goals

1. ✅ Lawyer dashboard fully functional (all pages)
2. ✅ LawyerProfile model + Cloudinary image upload
3. ✅ Toast notifications + theme toggle + bar-wave loader
4. ✅ Extended case schema (priority, court, featured)
5. ✅ Client dashboard — real data integration (appointments, cases, profile, book consultation)
6. ✅ Lawyer details page (public — real API, LawyerProfile data, availability)
7. ⏭️ About Us page
8. ✅ Appointment booking form (client dashboard)
9. ⏭️ Email notifications for case status updates

### Blockers

- None currently
