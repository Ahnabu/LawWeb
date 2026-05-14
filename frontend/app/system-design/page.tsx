"use client";

import { useState } from "react";

const NAVY = "#0a1628";
const GOLD = "#c9a84c";

// ─── Data ─────────────────────────────────────────────────────────────────────

const requirements = [
  {
    category: "Authentication & Security",
    items: [
      "JWT access tokens (httpOnly cookies, 3-day expiry)",
      "Refresh token rotation (7-day expiry)",
      "Email OTP verification via Resend API",
      "Role-based access control (admin / lawyer / client)",
      "Mandatory first-login password change for lawyers",
      "Zod schema validation on all inputs",
      "Rate limiting: 100 req/15min general, 5/15min on auth",
    ],
  },
  {
    category: "Public Website",
    items: [
      "Home page — hero, success stories, lawyer showcase",
      "Lawyers listing with search & filter",
      "Lawyer detail page with full profile",
      "Practice areas page",
      "Blog / news articles with rich content blocks",
      "Public case tracking by case number",
      "About Us page",
      "Multi-language support: Bengali (বাংলা) + English",
    ],
  },
  {
    category: "Client Portal",
    items: [
      "Register, verify email, login",
      "Browse lawyers & check availability",
      "Book consultations (date, time, type, message)",
      "View & cancel own appointments",
      "Track own case status",
      "Profile management with photo upload",
    ],
  },
  {
    category: "Lawyer Dashboard",
    items: [
      "Manage assigned consultations (view / complete / cancel)",
      "Create & manage own cases with full details",
      "Update case status, notes, court dates",
      "Set weekly availability schedule",
      "Full bilingual profile editing (EN + BN)",
      "Cloudinary profile image upload",
      "Feature / unfeature cases (star toggle)",
    ],
  },
  {
    category: "Admin Dashboard",
    items: [
      "Global stats: cases, lawyers, clients, today's appointments",
      "Add lawyers (auto-creates account with default password)",
      "Verify / unverify / remove lawyers",
      "Manage all cases and consultations",
      "Paginated client list with verification status",
      "Blog management — draft, publish, delete",
    ],
  },
  {
    category: "Case Management",
    items: [
      "Online & offline case tracking",
      "Priority levels: high / medium / low",
      "Case types: civil, criminal, corporate, family, immigration, and more",
      "Status lifecycle: active → filed → hearing → closed / won / lost / settled",
      "Court name, jurisdiction, opposing party, filing date",
      "Auto-generated case numbers (CAS-YYYY-###)",
    ],
  },
  {
    category: "Infrastructure & DevOps",
    items: [
      "MongoDB Atlas (cloud, auto-retry on disconnect)",
      "Cloudinary CDN (500×500 face-crop, old image cleanup)",
      "Resend API for transactional email",
      "Helmet security headers + CORS + HPP protection",
      "Gzip compression for all responses",
      "Nodemon with ts-node transpile-only for fast restarts",
    ],
  },
  {
    category: "Design System",
    items: [
      "Material Design 3 color tokens (Navy #0a1628, Gold #c9a84c)",
      "Light & dark mode (localStorage persisted)",
      "Playfair Display (headings) + Inter (body) + Hind Siliguri (Bengali)",
      "Fully responsive — mobile-first Tailwind CSS v4",
      "Sonner toast notifications (theme-aware)",
      "CSS bar-wave loader animation (compositor layer)",
    ],
  },
];

const roles = [
  {
    name: "Client",
    icon: "👤",
    color: "#1d4ed8",
    bg: "#eff6ff",
    border: "#bfdbfe",
    capabilities: [
      "Register & verify email via OTP",
      "Browse all lawyer profiles",
      "Check lawyer weekly availability",
      "Book consultations with lawyers",
      "View & cancel own appointments",
      "Track own case status & details",
      "Edit profile, upload photo",
    ],
  },
  {
    name: "Lawyer",
    icon: "⚖️",
    color: "#6d28d9",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    capabilities: [
      "Mandatory password change on first login",
      "View & manage assigned consultations",
      "Create & manage own cases",
      "Update case status, notes, court info",
      "Set weekly availability schedule",
      "Upload Cloudinary profile photo",
      "Edit bilingual profile (EN + BN)",
      "Feature / unfeature cases",
    ],
  },
  {
    name: "Admin",
    icon: "🛡️",
    color: NAVY,
    bg: "#f0f4ff",
    border: "#c1c5d0",
    capabilities: [
      "View global platform statistics",
      "Add lawyers (default password flow)",
      "Verify / remove lawyer accounts",
      "Manage all cases across platform",
      "Manage all consultations",
      "View paginated client list",
      "Create & publish blog articles",
    ],
  },
];

const flows = [
  {
    label: "Client Registration",
    color: "#1d4ed8",
    steps: [
      { title: "Register", desc: "Name, email, password, phone (BD format)" },
      { title: "OTP Email", desc: "6-digit code sent via Resend API" },
      { title: "Verify Email", desc: "Enter OTP — isVerified set to true" },
      { title: "Login", desc: "JWT set in httpOnly cookie (3 days)" },
      { title: "Client Dashboard", desc: "Access appointments, cases & profile" },
    ],
  },
  {
    label: "Book Consultation",
    color: "#059669",
    steps: [
      { title: "Browse Lawyers", desc: "Public list with search" },
      { title: "View Profile", desc: "Specialization, experience, rate" },
      { title: "Check Availability", desc: "Weekly schedule & accepting clients" },
      { title: "Book Form", desc: "Date, time, type, subject, message" },
      { title: "Confirmed", desc: "Consultation record created; lawyer notified" },
    ],
  },
  {
    label: "Lawyer Case Flow",
    color: "#6d28d9",
    steps: [
      { title: "First Login", desc: "Password change modal appears" },
      { title: "Change Password", desc: "passwordNeedsChange → false" },
      { title: "Cases Page", desc: "View all assigned cases with filters" },
      { title: "Add / Update", desc: "Create case, set status, court info" },
      { title: "Feature Case", desc: "Star toggle — case appears on public page" },
    ],
  },
  {
    label: "Admin Platform",
    color: NAVY,
    steps: [
      { title: "Dashboard", desc: "Stats: cases, clients, today's bookings" },
      { title: "Add Lawyer", desc: "Creates account — default password 123456" },
      { title: "Verify Lawyer", desc: "Toggle isVerified — lawyer goes public" },
      { title: "Manage Cases", desc: "Filter by status, update, reassign" },
      { title: "Publish Blog", desc: "Draft → review → publish article" },
    ],
  },
];

const models = [
  {
    name: "User",
    color: NAVY,
    fields: [
      "name, email, password (bcrypt hashed)",
      "role: admin | lawyer | client",
      "barId, phone, specialization",
      "isVerified, passwordNeedsChange",
      "profileImageUrl",
    ],
  },
  {
    name: "LawyerProfile",
    color: "#6d28d9",
    fields: [
      "userId → User (1-to-1 link)",
      "firstName, lastName",
      "designation, bio (bilingual EN/BN)",
      "education[], certifications[]",
      "practiceAreas[], languages[], hourlyRate",
    ],
  },
  {
    name: "Consultation",
    color: "#0891b2",
    fields: [
      "clientId → User, lawyerId → User",
      "consultationType (initial/follow-up/etc)",
      "date, time, subject, description",
      "status: scheduled | completed | cancelled",
      "notes (added by lawyer)",
    ],
  },
  {
    name: "Case",
    color: "#b45309",
    fields: [
      "caseNumber — auto (CAS-YYYY-###)",
      "clientId, lawyerId → User",
      "type, status, priority (high/med/low)",
      "courtName, jurisdiction, opposingParty",
      "isFeatured, isOnline, filingDate",
    ],
  },
  {
    name: "LawyerAvailability",
    color: "#059669",
    fields: [
      "lawyerId → User",
      "isAcceptingNewClients (boolean)",
      "schedule: { monday … sunday }",
      "Each day: isAvailable, startTime, endTime",
    ],
  },
  {
    name: "Blog",
    color: "#dc2626",
    fields: [
      "title, slug (auto from title)",
      "blocks[] — h1/h2/paragraph/quote/list",
      "status: draft | published | archived",
      "category, tags[], readingTimeMinutes",
      "authorId → User, publishedAt",
    ],
  },
];

const apiGroups = [
  {
    domain: "Auth",
    color: "#0891b2",
    endpoints: [
      { method: "POST", path: "/api/auth/register", desc: "Client registration with validation" },
      { method: "POST", path: "/api/auth/login", desc: "Login → sets JWT httpOnly cookies" },
      { method: "POST", path: "/api/auth/verify-email", desc: "Verify OTP code" },
      { method: "POST", path: "/api/auth/resend-verification-code", desc: "Resend OTP" },
      { method: "POST", path: "/api/auth/refresh", desc: "Rotate access token" },
      { method: "POST", path: "/api/auth/logout", desc: "Clear auth cookies" },
      { method: "POST", path: "/api/auth/change-password", desc: "Update password (authenticated)" },
    ],
  },
  {
    domain: "Lawyers",
    color: "#6d28d9",
    endpoints: [
      { method: "GET", path: "/api/lawyers/public", desc: "Public list — name, barId, specialization" },
      { method: "GET", path: "/api/lawyers/:id", desc: "Full lawyer profile (authenticated)" },
      { method: "GET", path: "/api/lawyers/:id/availability", desc: "Public availability schedule" },
      { method: "GET", path: "/api/lawyers/me/profile", desc: "Own LawyerProfile (auto-creates if new)" },
      { method: "PUT", path: "/api/lawyers/me/profile", desc: "Update bilingual profile fields" },
      { method: "POST", path: "/api/lawyers/me/profile/image", desc: "Upload profile photo (Cloudinary)" },
      { method: "GET", path: "/api/lawyers/me/availability", desc: "Own weekly schedule" },
      { method: "PUT", path: "/api/lawyers/me/availability", desc: "Update own schedule" },
    ],
  },
  {
    domain: "Cases",
    color: "#b45309",
    endpoints: [
      { method: "POST", path: "/api/cases", desc: "Create case (lawyer or admin)" },
      { method: "GET", path: "/api/cases/my-cases", desc: "Own cases (role-filtered)" },
      { method: "GET", path: "/api/cases/:id", desc: "Case details (authorized)" },
      { method: "PATCH", path: "/api/cases/:id", desc: "Update status, notes, court dates" },
      { method: "PATCH", path: "/api/cases/:id/toggle-featured", desc: "Toggle isFeatured flag" },
      { method: "DELETE", path: "/api/cases/:id", desc: "Delete case (admin only)" },
    ],
  },
  {
    domain: "Consultations",
    color: "#059669",
    endpoints: [
      { method: "POST", path: "/api/consultations/book", desc: "Book consultation (conflict-checked)" },
      { method: "GET", path: "/api/consultations/my-consultations", desc: "Own consultations (role-filtered)" },
      { method: "POST", path: "/api/consultations/:id/cancel", desc: "Cancel consultation" },
      { method: "PUT", path: "/api/consultations/:id/status", desc: "Update status (lawyer)" },
    ],
  },
  {
    domain: "Admin",
    color: NAVY,
    endpoints: [
      { method: "GET", path: "/api/admin/stats", desc: "Global platform statistics" },
      { method: "GET", path: "/api/admin/lawyers", desc: "All lawyers (including unverified)" },
      { method: "POST", path: "/api/admin/lawyers", desc: "Add lawyer — creates account" },
      { method: "PATCH", path: "/api/admin/lawyers/:id/toggle-verification", desc: "Verify / unverify" },
      { method: "DELETE", path: "/api/admin/lawyers/:id", desc: "Remove lawyer from platform" },
      { method: "GET", path: "/api/admin/clients", desc: "Paginated client list" },
      { method: "GET", path: "/api/admin/cases", desc: "All cases with filters" },
      { method: "GET", path: "/api/admin/consultations", desc: "All consultations with filters" },
    ],
  },
  {
    domain: "Blogs",
    color: "#dc2626",
    endpoints: [
      { method: "GET", path: "/api/blogs", desc: "Published blogs (public, paginated)" },
      { method: "GET", path: "/api/blogs/slug/:slug", desc: "Single blog by slug (public)" },
      { method: "POST", path: "/api/blogs", desc: "Create blog — draft by default (admin)" },
      { method: "PATCH", path: "/api/blogs/:id", desc: "Update blog content/status (admin)" },
      { method: "PATCH", path: "/api/blogs/:id/publish", desc: "Publish blog post (admin)" },
      { method: "DELETE", path: "/api/blogs/:id", desc: "Delete blog (admin)" },
    ],
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "#059669",
  POST: "#0891b2",
  PATCH: "#d97706",
  PUT: "#6d28d9",
  DELETE: "#dc2626",
};

// ─── Components ───────────────────────────────────────────────────────────────

function SectionHeader({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
          style={{ background: NAVY }}
        >
          {number}
        </span>
        <h3
          className="text-2xl md:text-3xl font-bold"
          style={{ fontFamily: "'Playfair Display', serif", color: NAVY }}
        >
          {title}
        </h3>
      </div>
      <p className="text-sm ml-11" style={{ color: "#5a5f6d" }}>{subtitle}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SystemDesignPage() {
  const [activeFlow, setActiveFlow] = useState(0);
  const [openApi, setOpenApi] = useState<number | null>(0);

  return (
    <div className="min-h-screen" style={{ background: "#f7f8fd" }}>

      {/* ── Hero ── */}
      <div style={{ background: NAVY }} className="px-6 py-16">
        <div className="max-w-5xl mx-auto text-center">
          <p
            className="text-xs font-bold tracking-widest uppercase mb-4"
            style={{ color: GOLD }}
          >
            Technical Specification Document
          </p>
          
          <p className="text-sm mb-8" style={{ color: GOLD }}>
            System Architecture · Requirements Planning · Data Flow
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {[
              "Next.js 15 (App Router)",
              "Express.js",
              "MongoDB Atlas",
              "TypeScript",
              "Tailwind CSS v4",
              "Cloudinary",
              "JWT Auth",
              "Resend Email",
            ].map((tech) => (
              <span
                key={tech}
                className="px-3 py-1 rounded-full text-xs font-medium border"
                style={{ color: GOLD, borderColor: GOLD + "55", background: GOLD + "11" }}
              >
                {tech}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {[
              { label: "User Roles", value: "3" },
              { label: "API Endpoints", value: "40+" },
              { label: "DB Collections", value: "6" },
              { label: "Dashboard Pages", value: "17+" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl py-4 px-3 text-center"
                style={{ background: GOLD + "18", border: `1px solid ${GOLD}44` }}
              >
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-xs mt-1" style={{ color: GOLD }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-14 space-y-20">

        {/* ── Section 1: Requirements ── */}
        <section>
          <SectionHeader
            number="1"
            title="Requirement Planning & Discovery"
            subtitle="All features defined before development — organized by functional area with full implementation status"
          />
          <div className="grid md:grid-cols-2 gap-5">
            {requirements.map((req) => (
              <div
                key={req.category}
                className="bg-white rounded-2xl p-6 shadow-sm"
                style={{ border: "1px solid #e2e6ef" }}
              >
                <h3
                  className="text-xs font-bold uppercase tracking-wider mb-4 pb-2"
                  style={{ color: GOLD, borderBottom: `2px solid ${GOLD}33` }}
                >
                  {req.category}
                </h3>
                <ul className="space-y-2">
                  {req.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm" style={{ color: "#374151" }}>
                      <span className="mt-0.5 flex-shrink-0 font-bold" style={{ color: "#10b981" }}>
                        ✓
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 2: User Roles ── */}
        <section>
          <SectionHeader
            number="2"
            title="User Roles & Permissions"
            subtitle="Three distinct roles with role-based access control enforced at the API middleware layer"
          />
          <div className="grid md:grid-cols-3 gap-6">
            {roles.map((role) => (
              <div
                key={role.name}
                className="rounded-2xl p-6 shadow-sm"
                style={{ background: role.bg, border: `1px solid ${role.border}` }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-3xl">{role.icon}</span>
                  <div>
                    <h3
                      className="font-bold text-xl"
                      style={{ fontFamily: "'Playfair Display', serif", color: role.color }}
                    >
                      {role.name}
                    </h3>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: role.color + "18", color: role.color }}
                    >
                      role: &quot;{role.name.toLowerCase()}&quot;
                    </span>
                  </div>
                </div>
                <ul className="space-y-2">
                  {role.capabilities.map((cap) => (
                    <li key={cap} className="text-sm flex items-start gap-2" style={{ color: "#374151" }}>
                      <span style={{ color: role.color }} className="mt-0.5 flex-shrink-0 font-bold">
                        →
                      </span>
                      {cap}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 3: System Architecture ── */}
        <section>
          <SectionHeader
            number="3"
            title="System Architecture"
            subtitle="High-level overview of all layers — from browser to database"
          />
          <div
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
            style={{ border: "1px solid #e2e6ef" }}
          >
            {/* Layer 1: Frontend */}
            <div className="p-6" style={{ background: "#eff6ff", borderBottom: "1px solid #bfdbfe" }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  Frontend Layer — Browser
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  "Next.js 15 App Router",
                  "TypeScript",
                  "Tailwind CSS v4 + MD3 Tokens",
                  "React Context (Auth · Language · Theme)",
                  "Lucide Icons",
                  "Sonner Toasts",
                  "34 route pages",
                  "3 Dashboards (Client / Lawyer / Admin)",
                ].map((item) => (
                  <span
                    key={item}
                    className="px-3 py-1 rounded-lg text-xs font-medium"
                    style={{ background: "#dbeafe", color: "#1e40af", border: "1px solid #bfdbfe" }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center items-center py-4" style={{ background: "#f9fafb" }}>
              <div className="flex flex-col items-center gap-1">
                <div className="w-px h-5" style={{ background: "#9ca3af" }} />
                <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ background: "#f3f4f6", color: "#6b7280", border: "1px solid #e5e7eb" }}>
                  HTTPS / REST API  ↓
                </span>
                <div className="w-px h-5" style={{ background: "#9ca3af" }} />
              </div>
            </div>

            {/* Layer 2: API */}
            <div className="p-6" style={{ background: "#f0f4ff", borderBottom: "1px solid #c1c5d0" }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full" style={{ background: NAVY }} />
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>
                  API Layer — Express.js Server
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  "Helmet (security headers)",
                  "CORS + HPP protection",
                  "Rate Limiting (prod)",
                  "Cookie Parser",
                  "Gzip Compression",
                  "JWT authenticateToken()",
                  "RBAC authorizeRoles()",
                  "Zod validation middleware",
                  "Multer (file uploads)",
                  "7 route domains",
                  "8 controllers",
                ].map((item) => (
                  <span
                    key={item}
                    className="px-3 py-1 rounded-lg text-xs font-medium"
                    style={{ background: "#eef1f9", color: NAVY, border: "1px solid #c1c5d0" }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center items-center py-4" style={{ background: "#f9fafb" }}>
              <div className="flex items-center gap-8 text-xl font-bold" style={{ color: "#9ca3af" }}>
                <span>↓</span>
                <span>↓</span>
                <span>↓</span>
              </div>
            </div>

            {/* Layer 3: Services */}
            <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200">
              <div className="p-6" style={{ background: "#fefce8" }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">🍃</span>
                  <p className="text-xs font-bold uppercase tracking-wider text-yellow-700">
                    Database
                  </p>
                </div>
                <p className="font-semibold text-sm mb-3 text-gray-800">MongoDB Atlas</p>
                <ul className="space-y-1.5 text-xs text-gray-600">
                  <li>→ Mongoose ODM v8</li>
                  <li>→ 6 collections (models)</li>
                  <li>→ Auto-retry on disconnect</li>
                  <li>→ Indexed queries</li>
                  <li>→ Pre-save hooks for auto-fields</li>
                </ul>
              </div>
              <div className="p-6" style={{ background: "#f0fdf4" }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">☁️</span>
                  <p className="text-xs font-bold uppercase tracking-wider text-green-700">
                    Media Storage
                  </p>
                </div>
                <p className="font-semibold text-sm mb-3 text-gray-800">Cloudinary CDN</p>
                <ul className="space-y-1.5 text-xs text-gray-600">
                  <li>→ 500×500 face-fill crop</li>
                  <li>→ 5MB upload limit</li>
                  <li>→ lawweb/profiles/ folder</li>
                  <li>→ Old image auto-deleted</li>
                  <li>→ Returns only imageUrl</li>
                </ul>
              </div>
              <div className="p-6" style={{ background: "#fff0f3" }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">📧</span>
                  <p className="text-xs font-bold uppercase tracking-wider text-red-700">
                    Email Service
                  </p>
                </div>
                <p className="font-semibold text-sm mb-3 text-gray-800">Resend API</p>
                <ul className="space-y-1.5 text-xs text-gray-600">
                  <li>→ 6-digit OTP codes</li>
                  <li>→ Styled HTML templates</li>
                  <li>→ Dev: console fallback</li>
                  <li>→ Prod: real email delivery</li>
                  <li>→ Expiry-controlled tokens</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 4: Request Lifecycle ── */}
        <section>
          <SectionHeader
            number="4"
            title="Backend Request Lifecycle"
            subtitle="Every API request passes through these middleware layers in sequence before reaching the controller"
          />
          <div
            className="bg-white rounded-2xl shadow-sm p-6 md:p-8"
            style={{ border: "1px solid #e2e6ef" }}
          >
            {/* Step boxes */}
            <div className="flex flex-col md:flex-row gap-2 md:gap-0 items-stretch overflow-x-auto pb-2">
              {[
                { step: 1, label: "HTTP Request", desc: "Client with JWT cookie", color: "#64748b" },
                { step: 2, label: "Security Layer", desc: "Helmet · CORS · HPP · Rate Limit", color: "#dc2626" },
                { step: 3, label: "Cookie Parser", desc: "Extract access & refresh tokens", color: "#d97706" },
                { step: 4, label: "authenticateToken()", desc: "Verify JWT; auto-rotate on expiry", color: "#6d28d9" },
                { step: 5, label: "authorizeRoles()", desc: "Enforce role: admin / lawyer / client", color: "#0891b2" },
                { step: 6, label: "Zod Validation", desc: "Schema check on request body", color: "#059669" },
                { step: 7, label: "Controller", desc: "Business logic + Mongoose query", color: NAVY },
                { step: 8, label: "JSON Response", desc: "Success data or error object", color: "#10b981" },
              ].map((item, i, arr) => (
                <div key={item.step} className="flex md:flex-col items-center flex-1 min-w-[100px]">
                  <div
                    className="flex-1 rounded-xl p-3 text-center text-white"
                    style={{ background: item.color }}
                  >
                    <div className="text-xs opacity-60 mb-1">Step {item.step}</div>
                    <div className="text-xs font-bold leading-tight">{item.label}</div>
                    <div className="text-xs opacity-75 mt-1 leading-tight hidden lg:block">
                      {item.desc}
                    </div>
                  </div>
                  {i < arr.length - 1 && (
                    <span className="text-gray-400 font-bold flex-shrink-0 text-lg px-1 md:py-1 md:rotate-0">
                      →
                    </span>
                  )}
                </div>
              ))}
            </div>
            {/* Notes grid */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  step: 4,
                  note: "If access token is expired, middleware attempts to silently rotate using the refresh token — no re-login required for 7 days.",
                },
                {
                  step: 5,
                  note: "Routes declare required roles: e.g. authorizeRoles('admin') blocks lawyers and clients at the middleware level, not in controller.",
                },
                {
                  step: 6,
                  note: "Zod schemas return field-level errors: { field: 'email', message: 'Invalid email format' } — never raw 500 errors for bad input.",
                },
                {
                  step: 7,
                  note: "Controllers use Mongoose with atomic upserts where needed (e.g., LawyerProfile uses findOneAndUpdate + $setOnInsert — race-condition safe).",
                },
              ].map((n) => (
                <div
                  key={n.step}
                  className="text-xs rounded-lg p-3"
                  style={{ background: "#f7f8fd", border: "1px solid #e2e6ef", color: "#374151" }}
                >
                  <span className="font-bold" style={{ color: NAVY }}>Step {n.step}: </span>
                  {n.note}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 5: User Flows ── */}
        <section>
          <SectionHeader
            number="5"
            title="Key User Flow Diagrams"
            subtitle="Step-by-step interaction paths for each role — click a tab to switch flows"
          />
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-5">
            {flows.map((flow, i) => (
              <button
                key={flow.label}
                onClick={() => setActiveFlow(i)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={
                  activeFlow === i
                    ? { background: flows[i].color, color: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }
                    : { background: "#fff", color: "#374151", border: "1px solid #e5e7eb" }
                }
              >
                {flow.label}
              </button>
            ))}
          </div>

          {/* Flow diagram */}
          <div
            className="bg-white rounded-2xl shadow-sm p-6 md:p-8"
            style={{ border: "1px solid #e2e6ef" }}
          >
            <div className="flex flex-col md:flex-row items-stretch gap-2 md:gap-0 overflow-x-auto pb-2">
              {flows[activeFlow].steps.map((step, i, arr) => (
                <div key={step.title} className="flex md:flex-col items-center flex-1 min-w-[130px]">
                  <div
                    className="flex-1 rounded-xl border-2 p-4 text-center"
                    style={{ borderColor: flows[activeFlow].color + "66", background: flows[activeFlow].color + "0d" }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold mx-auto mb-3"
                      style={{ background: flows[activeFlow].color }}
                    >
                      {i + 1}
                    </div>
                    <div className="font-semibold text-sm mb-1" style={{ color: flows[activeFlow].color }}>
                      {step.title}
                    </div>
                    <div className="text-xs leading-tight" style={{ color: "#6b7280" }}>
                      {step.desc}
                    </div>
                  </div>
                  {i < arr.length - 1 && (
                    <span
                      className="flex-shrink-0 font-bold text-xl px-2 md:py-2"
                      style={{ color: flows[activeFlow].color }}
                    >
                      →
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 6: Database Schema ── */}
        <section>
          <SectionHeader
            number="6"
            title="Database Schema"
            subtitle="MongoDB collections — 6 Mongoose models with their key fields and relationships"
          />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
            {models.map((model) => (
              <div
                key={model.name}
                className="bg-white rounded-2xl overflow-hidden shadow-sm"
                style={{ border: "1px solid #e2e6ef" }}
              >
                <div
                  className="px-5 py-3 text-white flex items-center justify-between"
                  style={{ background: model.color }}
                >
                  <span
                    className="font-bold"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {model.name}
                  </span>
                  <span className="text-xs opacity-70">collection</span>
                </div>
                <ul className="p-4 space-y-2">
                  {model.fields.map((field) => (
                    <li
                      key={field}
                      className="text-xs flex items-start gap-2"
                      style={{ fontFamily: "monospace", color: "#374151" }}
                    >
                      <span style={{ color: GOLD }} className="mt-0.5 flex-shrink-0">▸</span>
                      {field}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Relationships */}
          <div
            className="bg-white rounded-2xl shadow-sm p-6"
            style={{ border: "1px solid #e2e6ef" }}
          >
            <h3
              className="text-xs font-bold uppercase tracking-wider mb-4"
              style={{ color: NAVY }}
            >
              Collection Relationships
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                { rel: "User  (1)  ←──  LawyerProfile  (1)", via: "via userId" },
                { rel: "User  (1)  ←──  LawyerAvailability  (1)", via: "via lawyerId" },
                { rel: "User (client, 1)  ──→  Consultation  (many)", via: "via clientId" },
                { rel: "User (lawyer, 1)  ──→  Consultation  (many)", via: "via lawyerId" },
                { rel: "User (lawyer, 1)  ──→  Case  (many)", via: "via lawyerId" },
                { rel: "User (admin, 1)   ──→  Blog  (many)", via: "via authorId" },
              ].map((r) => (
                <div
                  key={r.rel}
                  className="flex items-center justify-between rounded-lg px-4 py-2.5 text-xs"
                  style={{ background: "#f7f8fd", border: "1px solid #e2e6ef" }}
                >
                  <span style={{ fontFamily: "monospace", color: "#374151" }}>{r.rel}</span>
                  <span
                    className="ml-3 flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium"
                    style={{ background: GOLD + "22", color: "#7a5c0f" }}
                  >
                    {r.via}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 7: API Map ── */}
        <section>
          <SectionHeader
            number="7"
            title="API Endpoint Reference"
            subtitle="RESTful endpoints organized by domain — click to expand each group"
          />
          <div className="space-y-3">
            {apiGroups.map((group, i) => (
              <div
                key={group.domain}
                className="bg-white rounded-2xl shadow-sm overflow-hidden"
                style={{ border: "1px solid #e2e6ef" }}
              >
                <button
                  onClick={() => setOpenApi(openApi === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-1 h-8 rounded-full flex-shrink-0"
                      style={{ background: group.color }}
                    />
                    <span
                      className="font-bold text-lg"
                      style={{ fontFamily: "'Playfair Display', serif", color: NAVY }}
                    >
                      {group.domain}
                    </span>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: group.color + "18", color: group.color }}
                    >
                      {group.endpoints.length} endpoints
                    </span>
                  </div>
                  <span style={{ color: "#9ca3af" }}>{openApi === i ? "▲" : "▼"}</span>
                </button>

                {openApi === i && (
                  <div
                    className="px-6 pb-5 pt-1"
                    style={{ borderTop: "1px solid #e2e6ef" }}
                  >
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-100">
                        {group.endpoints.map((ep) => (
                          <tr key={ep.path} className="hover:bg-gray-50">
                            <td className="py-2.5 pr-4 w-20">
                              <span
                                className="px-2 py-0.5 rounded text-xs font-bold text-white"
                                style={{
                                  background: METHOD_COLORS[ep.method] ?? "#64748b",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {ep.method}
                              </span>
                            </td>
                            <td
                              className="py-2.5 pr-4 text-xs"
                              style={{ fontFamily: "monospace", color: "#1e293b" }}
                            >
                              {ep.path}
                            </td>
                            <td className="py-2.5 text-xs" style={{ color: "#6b7280" }}>
                              {ep.desc}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer ── */}
        <footer
          className="text-center py-10 mt-8"
          style={{ borderTop: "1px solid #e2e6ef" }}
        >
          <div
            className="inline-block px-6 py-3 rounded-2xl mb-4"
            style={{ background: NAVY }}
          >
            <span
              className="text-white font-bold"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Islam &amp; Associates
            </span>
            <span className="text-white/50 mx-2">·</span>
            <span style={{ color: GOLD }} className="text-sm">Legal Services Platform</span>
          </div>
          <p className="text-xs" style={{ color: "#9ca3af" }}>
            Built with Next.js 15 · Express.js · MongoDB Atlas · TypeScript
          </p>
          <p className="text-xs mt-1" style={{ color: "#c1c5d0" }}>
            System Architecture Document — Islam &amp; Associates © 2025
          </p>
        </footer>

      </div>
    </div>
  );
}
