# Islam & Associates - Legal Services Platform

## Project Description

Islam & Associates is a legal services platform built with Next.js and Express.js. It allows clients to book appointments with lawyers, track cases, and access lawyer information. Multi-language support (Bengali & English) is built-in.

## Tech Stack

### Frontend

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with Material Design 3 tokens
- **Icons**: Lucide React
- **Localization**: React Context (Bengali/English)
- **Auth**: JWT tokens
- **Types**: Centralized in `/types` folder

### Backend

- **Framework**: Express.js
- **Language**: Node.js
- **Database**: MongoDB
- **Authentication**: JWT + bcrypt
- **Email**: Nodemailer (Gmail SMTP)

---

## Client Requirements

### 1. **Multi-Language Support** ✅

- Bengali and English
- Language toggle in navbar
- All pages and content translatable

### 2. **Home Page**

- Hero section
- Success stories section
- Lawyers showcase (cards with "See More" button)
- Footer with links

### 3. **Lawyers Information Page**

- List all lawyers
- Display: Name, Specialization, Experience, Photo
- "View Details" button for each lawyer

### 4. **Lawyer Details Page**

- Full lawyer profile
- Specializations
- Experience and qualifications
- Contact information
- "Book Appointment" button

### 5. **Appointment Booking**

- Appointment form (date, time, message)
- WhatsApp integration link
- Form submission to backend
- Confirmation

### 6. **Dashboards** (3 roles - No Navbar/Footer)

- **User/Client Dashboard**: View booked appointments, case status
- **Lawyer Dashboard**: Manage appointments, view cases
- **Owner/Admin Dashboard**: Manage lawyers, view all appointments

**Dashboard Structure**:
- Sidebar navigation (collapsible on mobile)
- Top bar with user info and logout
- Main content area
- Role-based menu items

### 7. **Case Management**

- Case tracking (online & offline)
- For offline cases: collect client email, add case info
- Case status updates
- Case details page

### 8. **About Us Page**

- Company information
- Mission/Vision
- Team overview

---

## Completed Features

### ✅ Authentication
- User registration (Client only — lawyers added by admin)
- Email verification with OTP
- Secure login with JWT (httpOnly cookies)
- Password strength validation
- Phone number validation (Bangladeshi format)
- Mandatory password change on first lawyer login (`passwordNeedsChange` flag)
- `POST /api/auth/change-password` endpoint

### ✅ Design System
- Material Design 3 colors
- Responsive layout (mobile-first)
- Light & Dark mode support
- Accessibility features
- Consistent component library

### ✅ UI Components
- Navbar (responsive, language toggle)
- Footer
- Language provider (i18n context)
- Login/Register pages (client only)
- Email verification page
- Dashboard Layout (sidebar with toggle on all screen sizes, top bar, content)
- ChangePasswordModal (mandatory on first lawyer login)
- LawyerPublicCard (API-driven, no dummy data)

### ✅ Admin Dashboard
- Stats overview (total cases, active cases, lawyers, clients, today's appointments)
- Appointments page: view all, filter by status, update consultation status inline
- Cases page: view all, filter by status, add new case via modal, update case status
- Lawyers page: add lawyer (creates account, default password 123456), verify/unverify, remove
- Users page: paginated client list with contact details and verification status
- Sidebar toggle visible on all screen sizes (collapsible desktop sidebar)

### ✅ Lawyer Management (Admin-controlled)
- Lawyers added only by admin (no public sign-up for lawyers)
- Account created with `passwordNeedsChange: true` and default password `123456`
- Pop-up modal forces password change on first dashboard login
- Two API endpoints: `/api/lawyers/public` (name, barId, specialization only) and `/api/lawyers` (full data)

### ✅ Public Pages (Real API Data)
- Home page lawyer section fetches from `/api/lawyers/public`
- Our Lawyers page fetches from `/api/lawyers/public` with search filter

### ✅ Lawyer Dashboard (Fully Functional)

- **Appointments page**: Compact table with status filter tabs; "View Details" modal shows full consultation info and allows marking complete/cancel inline
- **Cases page**: Compact table with status filter tabs; lawyers can add their own cases via modal form (with court, jurisdiction, opposing party, priority); star icon to feature/unfeature cases; "View Details" links to dedicated case detail page
- **Case Detail page**: Full case info, update status and notes, feature toggle
- **Availability page**: Fixed routing bug (`/me/availability` was being caught by `/:lawyerId/availability`); schedule and client acceptance toggle fully working
- **Profile page**: Full edit mode with bilingual fields (EN/BN), practice areas, languages, education, certifications, hourly rate, contact info; profile image upload via Cloudinary; backed by `LawyerProfile` model separate from `User`
- All titles use `h3` throughout the Lawyer dashboard

### ✅ Extended Case Schema

- Added `priority` (high/medium/low), `courtName`, `jurisdiction`, `opposingParty`, `opposingCounsel`, `filingDate`, `isFeatured`
- Added `settled` and `appealed` to status enum; `labor`, `tax`, `constitutional`, `environmental` to type enum
- Lawyers can now create their own cases (previously admin-only)
- `PATCH /api/cases/:id/toggle-featured` endpoint added

### ✅ LawyerProfile Model

- Separate MongoDB document linked to `User` via `userId`
- Bilingual `designation` and `bio` (en/bn), education, certifications, practice areas, languages, hourly rate, WhatsApp, contact info
- Auto-created on first access with name/barId seeded from User
- Atomic `findOneAndUpdate` + `$setOnInsert` + `upsert: true` — race-condition safe

### ✅ Cloudinary Image Upload

- `backend/src/config/multer.config.ts` — CloudinaryStorage with 500×500 face-fill crop, 5MB limit, image-only filter
- `POST /api/lawyers/me/profile/image` — uploads to `lawweb/profiles/` folder, deletes old image before saving new one
- Response returns only `{ profileImageUrl }` — no sensitive profile data exposed

### ✅ UX / Developer Experience Improvements

- **Sonner toasts**: Global `<SonnerToaster />` in root layout; all four lawyer dashboard pages show loading/success/error toasts replacing inline alert divs
- **Theme toggle**: Sun/Moon button added to dashboard topbar (beside Home icon); reads from existing `ThemeProvider`, persists in localStorage
- **Bar-wave loader**: CSS `@keyframes bar-wave` with three staggered `scaleY` bars replaces "Loading..." text on dashboard auth check; uses `will-change: transform` for compositor-layer promotion
- **dotenv load-order fix**: `backend/src/config/env.ts` imported as the very first line of `server.ts` so `process.env` is populated before any other module (including Cloudinary config) runs

### ✅ Backend Configuration

- JWT access token expiry increased from 15 minutes → **3 days** (cookie `maxAge` updated to match)
- `nodemon.json` uses `ts-node --transpile-only` with `delay: 500` for fast auto-restarts on `.ts` file changes
- Route ordering fixed in `backend/src/routes/lawyers.ts`: all `/me/*` routes registered before `/:lawyerId` to prevent "me" being cast as MongoDB ObjectId

---

## Project Structure

```
LawWeb/
├── frontend/
│   ├── app/                        # Next.js app directory
│   │   ├── page.tsx                # Home page
│   │   ├── about/page.tsx          # About page
│   │   ├── lawyers/page.tsx        # Lawyers list
│   │   ├── lawyers/[id]/page.tsx   # Lawyer details
│   │   ├── register/
│   │   ├── login/
│   │   ├── verify-email/
│   │   └── dashboard/              # Dashboard routes
│   │       ├── layout-wrapper.tsx  # Protected layout wrapper
│   │       ├── client/
│   │       │   ├── layout.tsx      # Client dashboard layout
│   │       │   ├── page.tsx        # Client dashboard page
│   │       │   ├── appointments/
│   │       │   ├── cases/
│   │       │   └── profile/
│   │       ├── lawyer/
│   │       │   ├── layout.tsx      # Lawyer dashboard layout
│   │       │   ├── page.tsx        # Lawyer dashboard page
│   │       │   ├── appointments/
│   │       │   ├── cases/
│   │       │   ├── availability/
│   │       │   └── profile/
│   │       └── admin/
│   │           ├── layout.tsx      # Admin dashboard layout
│   │           ├── page.tsx        # Admin dashboard page
│   │           ├── appointments/
│   │           ├── cases/
│   │           ├── lawyers/
│   │           └── users/
│   ├── components/                 # Reusable components
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── AuthProvider.tsx
│   │   ├── LanguageProvider.tsx
│   │   ├── ThemeProvider.tsx        # Light/dark toggle (persists in localStorage)
│   │   ├── DashboardLayout.tsx     # Sidebar + topbar + theme toggle + home link
│   │   ├── SonnerToaster.tsx       # Theme-aware Sonner toast wrapper
│   │   └── ...
│   ├── types/                      # Centralized types
│   │   ├── index.ts                # Common types (User, Auth, API)
│   │   ├── lawyer.ts               # Lawyer-related types
│   │   ├── appointment.ts          # Appointment types
│   │   ├── case.ts                 # Case types
│   │   └── dashboard.ts            # Dashboard types
│   ├── lib/                        # Utilities & API calls
│   │   ├── auth.ts
│   │   ├── api.ts
│   │   ├── dashboard.ts            # Lawyer profile, availability, consultation APIs
│   │   └── translations.ts
│   ├── globals.css                 # Design tokens, base styles, bar-wave keyframe
│   └── ...
├── backend/                        # Express.js API
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts              # First import in server.ts — loads dotenv before any module
│   │   │   └── multer.config.ts    # Cloudinary storage + multer instance
│   │   ├── routes/
│   │   ├── models/
│   │   │   ├── LawyerProfile.ts    # Separate profile document (bilingual, education, etc.)
│   │   │   └── Case.ts             # Extended with priority, court, isFeatured
│   │   ├── controllers/
│   │   │   └── lawyerProfileController.ts
│   │   └── middleware/
│   └── ...
├── docs/                           # Project documentation
├── agents/                         # AI agent guidelines
└── README.md
```

---

## Dashboard Architecture

### Dashboard Layout System
```
DashboardLayout (Component)
  ├── Sidebar (Navigation with role-based menu)
  ├── Top Bar (User info, logout, home link)
  └── Main Content Area
      └── Role-specific Page (Client/Lawyer/Admin)
```

### Files Structure for Each Dashboard Role

#### Client Dashboard
```
frontend/app/dashboard/client/
├── layout.tsx          # Wraps with DashboardLayout (role="client")
├── page.tsx            # Main dashboard page with stats
├── appointments/
│   └── page.tsx
├── cases/
│   └── page.tsx
└── profile/
    └── page.tsx
```

#### Lawyer Dashboard
```
frontend/app/dashboard/lawyer/
├── layout.tsx          # Wraps with DashboardLayout (role="lawyer")
├── page.tsx
├── appointments/
├── cases/
├── availability/
└── profile/
```

#### Admin Dashboard
```
frontend/app/dashboard/admin/
├── layout.tsx          # Wraps with DashboardLayout (role="admin")
├── page.tsx
├── appointments/
├── cases/
├── lawyers/
└── users/
```

---

## Types Folder Structure

The `frontend/types/` folder centralizes all TypeScript types:

```
types/
├── index.ts           # Common types (User, Auth, ApiResponse)
├── lawyer.ts          # Lawyer, LawyerProfile, LawyerListItem
├── appointment.ts     # Appointment, BookAppointmentData
├── case.ts            # Case, CaseStatus, CaseDocument
└── dashboard.ts       # DashboardStats, SidebarItem, etc
```

**Benefits**:
- Single source of truth for types
- Easy to import: `import { User, Appointment } from '@/types'`
- Cleaner component files (no type definitions inside)
- Consistent across entire frontend

---

## Pages to Build

| Page | Status | Description |
|------|--------|-------------|
| Home | 🔲 To Do | Hero, success stories, lawyer cards, footer |
| About Us | 🔲 To Do | Company info, mission, team |
| Lawyers List | 🔲 To Do | All lawyers with cards, search, filter |
| Lawyer Details | 🔲 To Do | Full profile, book appointment button |
| Appointment Form | 🔲 To Do | Date, time, message, WhatsApp link |
| User Dashboard | ✅ Template | Appointments, cases, profile |
| Lawyer Dashboard | ✅ Fully Functional | Appointments (table+modal), Cases (table+add+feature+detail), Availability, Profile (full edit) |
| Owner Dashboard | ✅ Fully Functional | Stats, appointments, cases, lawyers, users |
| Case Tracking | ✅ Done (Lawyer) | Lawyer can add/view/update cases; admin manages all |
| Offline Case Form | 🔲 To Do | Collect email, add case info |

---

## Design Tokens

### Colors (Material Design 3)
```
Primary: #0a1628 (Navy)
Secondary: #c9a84c (Gold)
Error: #ba1a1a
Surface (Light): #ffffff
Surface (Dark): #08111f
```

### Fonts
- **Display**: Playfair Display (headings)
- **Body**: Inter (text)
- **Bengali**: Hind Siliguri

### Spacing
- Use Tailwind scale: 4px, 8px, 12px, 16px, 24px, 32px (px-1 to px-8)
- No random values

---

## API Endpoints

### Authentication
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/verify-email
POST   /api/auth/change-password
POST   /api/auth/refresh
POST   /api/auth/logout
```

### Lawyers (Public)
```
GET    /api/lawyers/public           (name, barId, specialization only)
GET    /api/lawyers                  (full data — authenticated)
GET    /api/lawyers/:lawyerId        (single lawyer profile)
GET    /api/lawyers/:lawyerId/availability   (public availability)
```

### Lawyers (Authenticated — lawyer role)

```
GET    /api/lawyers/me/profile       (get or auto-create LawyerProfile)
PUT    /api/lawyers/me/profile       (update profile fields)
POST   /api/lawyers/me/profile/image (upload profile photo via Cloudinary)
GET    /api/lawyers/me/availability  (get own schedule)
PUT    /api/lawyers/me/availability  (update own schedule)
```

### Cases

```
POST   /api/cases                    (create — admin or lawyer)
GET    /api/cases                    (list all — admin)
GET    /api/cases/my-cases           (lawyer's own cases)
GET    /api/cases/:caseId            (details)
PATCH  /api/cases/:caseId            (update status/notes)
PATCH  /api/cases/:caseId/toggle-featured   (toggle isFeatured)
```

### Consultations (Appointments)

```
POST   /api/consultations            (book)
GET    /api/consultations            (list — admin)
GET    /api/consultations/my         (lawyer's assigned consultations)
PATCH  /api/consultations/:id/status (update status)
```

### Admin
```
GET    /api/admin/stats              (global stats)
GET    /api/admin/lawyers            (all lawyers)
POST   /api/admin/lawyers            (add lawyer — creates account)
PATCH  /api/admin/lawyers/:id/verify (verify/unverify)
DELETE /api/admin/lawyers/:id        (remove)
GET    /api/admin/users              (paginated client list)
```

---

## Next Steps

1. Build Home page (hero, stories, lawyer cards)
2. Create Lawyers page and details page
3. Build Appointment form with WhatsApp link
4. Implement dashboards (user, lawyer, owner) ← Done template
5. Add case tracking feature
6. Offline case handling (email collection)

