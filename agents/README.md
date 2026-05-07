# Islam & Associates - Agent Guidelines

## Start Here

1. Read `/docs/00-PROJECT-OVERVIEW.md` — understand what's being built
2. Read `/docs/02-DESIGN-CONSISTENCY.md` — design rules (critical!)
3. Use the appropriate prompt below

---

## Prompts (Copy & Paste)

### **Frontend Development**

**When**: Building pages, components, forms, UI
**File**: `prompts/frontend-development.md`

**Rules**:

- No hard-coded colors (use design tokens)
- Use spacing scale only (4, 8, 12, 16, 24, 32px)
- Responsive design (test 320px, 640px, 1024px)
- TypeScript types required
- Keyboard accessible

---

### **Backend Development**

**When**: Creating APIs, database models, authentication
**File**: `prompts/backend-development.md`

**Format**: All responses must have `status`, `message`, `data`/`error`

**Endpoints Needed**:

- Auth (login, register, verify-email)
- Lawyers (list, details)
- Appointments (book, list, update)
- Cases (create, update, track)
- Users (profile)

---

### **Full-Stack Implementation**

**When**: Building complete features (API + DB + UI together)
**File**: `prompts/fullstack-development.md`

**Workflow**: Plan → Backend → Frontend → Test

**Examples**:

- Book appointment feature
- Offline case tracking
- Lawyer profile

---

## Pages to Build (From Client Requirements)

### Must Build (Critical Path)

1. **Home Page** — hero, success stories, lawyer cards, footer
2. **About Us Page** — company info
3. **Lawyers Page** — list all lawyers
4. **Lawyer Details** — full profile, book button
5. **Appointment Form** — date, time, message, WhatsApp link

### Dashboards

6. **User Dashboard** — appointments, cases
7. **Lawyer Dashboard** — appointments, cases assigned
8. **Owner/Admin Dashboard** — all data

### Case Management

9. **Case Tracking** — online & offline cases
10. **Offline Case Form** — collect email, add case info

---

## Design Tokens (REQUIRED - Never Hardcode)

### Colors

```
bg-primary         → #0a1628 (navy blue)
bg-secondary       → #c9a84c (gold)
text-on-surface    → #1b1b1d (dark text)
text-on-surface-variant → #5a5f6d (muted text)
text-error         → #ba1a1a (red)
```

### Spacing (NO Random Values)

```
px-1, py-1, gap-1           → 4px
px-2, py-2, gap-2           → 8px
px-3, py-3, gap-3           → 12px
px-4, py-4, gap-4           → 16px
px-6, py-6, gap-6           → 24px
px-8, py-8, gap-8           → 32px
```

### Responsive

```
Mobile:  default (< 640px)
Tablet:  sm:    (640px+)
Desktop: lg:    (1024px+)
```

---

## Quick Tips

### When Building Frontend

```tsx
// ✅ RIGHT - use design tokens
<button className="bg-primary text-on-primary px-4 py-2.5">
  Book
</button>

// ❌ WRONG - hard-coded color
<button className="bg-blue-600 text-white px-5 py-3">
  Book
</button>
```

### When Building Backend

```javascript
// ✅ RIGHT - consistent response
res.status(201).json({
  status: 201,
  message: 'Appointment booked',
  data: { id, date, time }
})

// ❌ WRONG - inconsistent format
res.json({ success: true, appointment: { ... } })
```

### When Testing

- Frontend: Check at 320px, 640px, 1024px
- Backend: Test with Postman, verify database
- Full-Stack: Form → API → Database → UI

---

## Project Files

### Frontend

- `frontend/app/` — pages to build
- `frontend/components/` — reusable components
- `frontend/lib/` — API calls, utilities
- `frontend/app/globals.css` — design tokens (read-only)

### Backend

- `backend/index.js` — main server file
- `backend/routes/` — API endpoints
- `backend/models/` — database schemas

### Docs

- `docs/00-PROJECT-OVERVIEW.md` — requirements
- `docs/01-PHASES-ROADMAP.md` — timeline
- `docs/02-DESIGN-CONSISTENCY.md` — design rules

---

## Current Status

**Completed**: Auth system, design system, navbar, footer, register page
**In Progress**: Home page, public pages
**Next**: Dashboards, case management

---

## Common Mistakes to Avoid

❌ Hard-coding colors
❌ Using random spacing values (mb-7, px-5)
❌ Not testing on mobile
❌ Forgetting responsive prefixes (sm:, lg:)
❌ Page-specific components (not reusable)
❌ Missing TypeScript types
❌ Inconsistent API responses
❌ No error handling

---

## How to Use

### For Frontend Task

```
Copy the frontend-development.md prompt:

"I need to build the [Page Name] page following these guidelines:
[paste frontend-development.md]

Here's the design system:
[paste docs/02-DESIGN-CONSISTENCY.md]

Requirements:
- [specific requirement]
- [specific requirement]"
```

### For Backend Task

```
Copy the backend-development.md prompt:

"I need to create the [Endpoint Name] API endpoint:
[paste backend-development.md]

API contract:
- Method: POST /api/[endpoint]
- Request: { ... }
- Response: { ... }"
```

### For Full-Stack Feature

```
Copy the fullstack-development.md prompt:

"I need to implement [Feature Name] end-to-end:
[paste fullstack-development.md]

Workflow:
1. Backend: Create [API]
2. Frontend: Build [UI]
3. Test: Verify [flow]"
```

---

## Questions?

- Design question? → Check `docs/02-DESIGN-CONSISTENCY.md`
- Requirements question? → Check `docs/00-PROJECT-OVERVIEW.md`
- Timeline question? → Check `docs/01-PHASES-ROADMAP.md`
- Code example? → Check existing files in frontend/backend folders
