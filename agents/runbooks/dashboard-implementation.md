# Dashboard Implementation Runbook

## Goal

Build functional dashboards for Client, Lawyer, and Admin roles with proper navigation, data fetching, and role-based visibility.

## When to Use

- Implementing dashboard pages for a specific role
- Adding features to existing dashboards
- Setting up dashboard layouts and navigation
- Connecting dashboard to backend APIs

## Prerequisites

- Backend APIs implemented and tested
- User authentication working
- Role information accessible from auth context
- Design mockups approved

## Step-by-Step Process

### 1. Plan Dashboard Structure (15 min)

**For each role, define**:

- Sidebar navigation items
- Main content sections
- Data to display
- User actions available
- API endpoints needed

**Example: Client Dashboard**

```
Sidebar Navigation:
- Appointments
- My Cases
- Lawyers
- Profile
- Settings

Main Content:
- Upcoming Appointments (list)
- Active Cases (list)
- Quick Stats (appointment count, active cases)
- Recent Activity (timeline)

Actions:
- Book appointment
- View case details
- Message lawyer
- Cancel appointment
```

**Create file**: `frontend/components/DashboardLayout.tsx`

```tsx
export interface DashboardLayoutProps {
  role: "client" | "lawyer" | "admin";
  children: React.ReactNode;
}

export function DashboardLayout({ role, children }: DashboardLayoutProps) {
  const navItems = getNavItemsForRole(role);

  return (
    <div className="flex h-screen">
      <Sidebar items={navItems} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
```

### 2. Create Dashboard Layout Components (20 min)

**File Structure**:

```
frontend/components/
├── DashboardLayout.tsx     (wrapper)
├── DashboardSidebar.tsx    (navigation)
├── DashboardHeader.tsx     (top bar with user info)
└── DashboardSection.tsx    (content area with title)
```

**Create Sidebar Component**:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export function DashboardSidebar({ items }: { items: SidebarItem[] }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 border-r border-outline-variant bg-surface md:flex md:flex-col">
      <nav className="flex-1 space-y-1 p-4">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

### 3. Fetch and Display Data (25 min)

**For each dashboard section, follow this pattern**:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

interface Appointment {
  id: string;
  date: string;
  time: string;
  lawyerName: string;
  status: string;
}

export function AppointmentsSection() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await fetch("/api/appointments", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (!response.ok) throw new Error("Failed to fetch appointments");

        const result = await response.json();
        setAppointments(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div className="text-error">{error}</div>;
  if (appointments.length === 0) return <div>No appointments</div>;

  return (
    <div className="space-y-4">
      {appointments.map((apt) => (
        <div
          key={apt.id}
          className="rounded-lg border border-outline-variant bg-surface-container p-4"
        >
          <p className="font-semibold text-on-surface">{apt.lawyerName}</p>
          <p className="text-sm text-on-surface-variant">
            {apt.date} at {apt.time}
          </p>
          <span className="mt-2 inline-block rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
            {apt.status}
          </span>
        </div>
      ))}
    </div>
  );
}
```

### 4. Create Role-Specific Dashboard Pages (20 min)

**Client Dashboard** (`frontend/app/dashboard/client/page.tsx`):

```tsx
"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { AppointmentsSection } from "@/components/dashboard/AppointmentsSection";
import { CasesSection } from "@/components/dashboard/CasesSection";

export default function ClientDashboard() {
  return (
    <DashboardLayout role="client">
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold text-on-surface">Dashboard</h1>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AppointmentsSection />
          </div>
          <div>
            <CasesSection />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
```

**Lawyer Dashboard** (`frontend/app/dashboard/lawyer/page.tsx`):

```tsx
"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { AvailabilitySection } from "@/components/dashboard/AvailabilitySection";
import { CaseManagementSection } from "@/components/dashboard/CaseManagementSection";

export default function LawyerDashboard() {
  return (
    <DashboardLayout role="lawyer">
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold text-on-surface">My Dashboard</h1>

        <div className="mt-8 grid gap-6">
          <AvailabilitySection />
          <CaseManagementSection />
        </div>
      </div>
    </DashboardLayout>
  );
}
```

### 5. Add Navigation and User Menu (15 min)

**Dashboard Header with User Menu**:

```tsx
"use client";

import { useAuth } from "@/components/AuthProvider";
import { ChevronDown, LogOut } from "lucide-react";
import { useState, useRef } from "react";
import Link from "next/link";

export function DashboardHeader() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  return (
    <header className="border-b border-outline-variant bg-surface p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-on-surface">
          Welcome, {user?.name}
        </h2>

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 hover:bg-surface-container"
          >
            <span>{user?.email}</span>
            <ChevronDown className="h-4 w-4" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-lg border border-outline-variant bg-surface shadow-lg">
              <Link
                href="/profile"
                className="block px-4 py-3 text-sm hover:bg-surface-container"
              >
                Profile Settings
              </Link>
              <button
                onClick={async () => {
                  await logout();
                  window.location.href = "/";
                }}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm hover:bg-surface-container text-error"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
```

### 6. Connect Backend APIs (20 min)

**Create API service functions**:

```typescript
// frontend/lib/api.ts
export async function fetchAppointments(token: string) {
  const response = await fetch("/api/appointments", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Failed to fetch");
  return response.json();
}

export async function fetchCases(token: string) {
  const response = await fetch("/api/cases", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Failed to fetch");
  return response.json();
}

export async function updateAppointmentStatus(
  id: string,
  status: string,
  token: string,
) {
  const response = await fetch(`/api/appointments/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error("Failed to update");
  return response.json();
}
```

### 7. Test Dashboard Functionality (20 min)

**Checklist**:

- [ ] All sections load without errors
- [ ] Data displays correctly
- [ ] API calls working (check Network tab)
- [ ] Loading and error states visible
- [ ] Navigation works between sections
- [ ] User menu works
- [ ] Mobile layout responsive
- [ ] Role-based content restricted properly

**Test scenarios**:

1. Load dashboard as authenticated user
2. Try logout
3. Navigate between sections
4. Check that only relevant data shows
5. Test on mobile (DevTools)
6. Test on tablet/desktop

### 8. Implement Role-Based Redirects (10 min)

**Protect dashboard routes**:

```tsx
// frontend/app/dashboard/layout.tsx
"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && user) {
      // Valid user in dashboard
    } else if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, user, router]);

  if (status === "loading") return <div>Loading...</div>;
  if (!user) return null;

  return children;
}
```

## Common Issues & Solutions

### Issue: Data not loading

**Solution**:

1. Check Network tab for API errors
2. Verify token is valid
3. Check backend API responds correctly
4. Add error logging

### Issue: Wrong role seeing dashboard

**Solution**:

1. Verify role in AuthProvider
2. Add role-based redirects
3. Check localStorage token

### Issue: Navigation not working

**Solution**:

1. Use `next/link` not `<a>` tags
2. Verify href paths match routes
3. Check `usePathname()` for active states

## Files to Create

```
frontend/
├── app/dashboard/
│   ├── layout.tsx              (protects routes)
│   ├── client/page.tsx
│   ├── lawyer/page.tsx
│   └── admin/page.tsx
├── components/
│   ├── DashboardLayout.tsx
│   ├── DashboardSidebar.tsx
│   ├── DashboardHeader.tsx
│   └── dashboard/
│       ├── AppointmentsSection.tsx
│       ├── CasesSection.tsx
│       ├── AvailabilitySection.tsx
│       └── ... (more sections)
└── lib/
    └── api.ts               (dashboard API calls)
```

## Success Criteria

- All three dashboards render correctly
- Data loads from backend APIs
- Role-based content visible only to right role
- Navigation works smoothly
- Mobile responsive
- Error handling in place
- No console errors
