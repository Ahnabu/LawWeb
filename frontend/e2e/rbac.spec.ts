import { execSync } from "child_process";
import path from "path";
import { expect, request, test, type APIRequestContext, type Browser, type Page } from "@playwright/test";

// Role-based access walkthrough (docs/rbac/phase-4-hardening-rollout.md §2).
//   E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... npx playwright test e2e/rbac.spec.ts
//
// Test accounts:
// - The super-admin comes from E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD, as in admin-crud.spec.ts.
// - The demo lawyer, client and assistant come from `npm run seed:rbac-demo` (backend), which
//   beforeAll runs first. It resets them, a demo case and an unconfirmed booking. It refuses
//   to run with NODE_ENV=production, so point the backend .env at a development database.
// - The staff account flow 1 creates in the UI only gets its password by email, so the spec
//   sets one with `seed:rbac-demo -- --set-password <email>`.
// Records this spec creates are tagged E2E-TEST and removed in afterAll. The demo accounts stay;
// `npm run seed:rbac-demo -- --clean` removes them.

const WEB = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const API = process.env.E2E_API_URL ?? "http://localhost:5000";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "";
const BACKEND_DIR = process.env.E2E_BACKEND_DIR ?? path.resolve(process.cwd(), "../backend");
const DEMO_PASSWORD = process.env.RBAC_DEMO_PASSWORD ?? "Demo@12345";
const DEMO = {
  lawyer: { email: "rbac-demo-lawyer@example.com", name: "RBAC-DEMO Lawyer" },
  client: { email: "rbac-demo-client@example.com", name: "RBAC-DEMO Client" },
  assistant: { email: "rbac-demo-assistant@example.com", name: "RBAC-DEMO Assistant" },
  caseTitle: "RBAC-DEMO Case",
  bookingSubject: "RBAC-DEMO Booking",
};

const stamp = Date.now().toString(36);
const roleName = `E2E-TEST Content Editor ${stamp}`;
const staff = { name: `E2E-TEST Staff ${stamp}`, email: `e2e-test-staff-${stamp}@example.com` };

test.describe.configure({ mode: "serial" });

const pages: Record<"admin" | "staff" | "lawyer" | "assistant" | "client", Page | null> = {
  admin: null, staff: null, lawyer: null, assistant: null, client: null,
};
let roleId = "";
let staffId = "";
const apiErrors: string[] = [];

function seed(args = "") {
  execSync(`npm run seed:rbac-demo --silent -- ${args}`.trim(), { cwd: BACKEND_DIR, stdio: "pipe" });
}

async function signIn(browser: Browser, email: string, password: string, landing: RegExp) {
  const page = await browser.newPage();
  page.on("response", (res) => {
    if (res.url().startsWith(API) && res.status() >= 400) {
      apiErrors.push(`${email}: ${res.request().method()} ${res.url().replace(API, "")} → ${res.status()}`);
    }
  });
  await page.goto("/login");
  await page.getByLabel("Email Address").fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(landing, { timeout: 60_000 });
  return page;
}

// Direct API calls with a page's auth cookies
async function apiAs(page: Page): Promise<APIRequestContext> {
  return request.newContext({ baseURL: API, extraHTTPHeaders: { Origin: WEB }, storageState: await page.context().storageState() });
}

const sidebar = (page: Page) => page.getByRole("navigation", { name: "Dashboard" });
const noAccess = (page: Page) => page.getByText("You don't have access to this page");
const toast = (page: Page, text: string | RegExp) => page.locator("[data-sonner-toast]").filter({ hasText: text }).first();

test.beforeAll(async () => {
  expect(ADMIN_EMAIL && ADMIN_PASSWORD, "set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD").toBeTruthy();
  seed();
});

test.afterAll(async () => {
  if (pages.admin && (staffId || roleId)) {
    const api = await apiAs(pages.admin);
    if (staffId) await api.delete(`/api/admin/staff/${staffId}`);
    if (roleId) await api.delete(`/api/admin/roles/${roleId}`);
    await api.dispose();
  }
  console.log("\n=== API responses >= 400 during run ===\n" + (apiErrors.join("\n") || "(none)"));
  await Promise.all(Object.values(pages).map((p) => p?.close()));
});

// ── 1. Super-admin: a Content Editor role and a staff account ──────────────────
test("super-admin creates a role from the Content Editor template", async ({ browser }) => {
  pages.admin = await signIn(browser, ADMIN_EMAIL, ADMIN_PASSWORD, /\/dashboard\/admin/);
  const page = pages.admin;
  await page.goto("/dashboard/admin/roles");
  await page.getByRole("button", { name: "New role" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Start from a template").selectOption("Content Editor");
  await dialog.getByPlaceholder("e.g. Receptionist").fill(roleName);
  const created = page.waitForResponse((r) => r.url().endsWith("/api/admin/roles") && r.request().method() === "POST");
  await dialog.getByRole("button", { name: "Create role" }).click();
  const res = await created;
  const body = await res.json();
  expect(res.status(), body.message).toBe(201);
  roleId = body.data._id;
  await expect(page.getByText(roleName)).toBeVisible();
});

test("super-admin adds a staff member with that role", async () => {
  const page = pages.admin!;
  await page.goto("/dashboard/admin/team");
  await page.getByRole("button", { name: "Add staff" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Full name").fill(staff.name);
  await dialog.getByLabel("Email").fill(staff.email);
  await dialog.getByLabel("Role").selectOption({ label: roleName });
  const created = page.waitForResponse((r) => r.url().endsWith("/api/admin/staff") && r.request().method() === "POST");
  await dialog.getByRole("button", { name: "Add staff member" }).click();
  const res = await created;
  const body = await res.json();
  expect(res.status(), body.message).toBe(201);
  staffId = body.data._id;
  // The setup link goes by email; give the account a known password instead
  seed(`--set-password ${staff.email}`);
});

test("the staff member sees only Blogs, Content and Settings", async ({ browser }) => {
  pages.staff = await signIn(browser, staff.email, DEMO_PASSWORD, /\/dashboard\/staff/);
  const page = pages.staff;
  await expect(sidebar(page).getByRole("link")).toHaveText(["Home", "Blogs", "Content", "Settings"]);

  await page.goto("/dashboard/admin/users");
  await expect(noAccess(page)).toBeVisible();
  const api = await apiAs(page);
  expect((await api.get("/api/admin/users")).status()).toBe(403);
  await api.dispose();
});

// ── 2. Lawyer adds an assistant; the assistant confirms a booking ──────────────
test("the lawyer adds an assistant with Scheduling", async ({ browser }) => {
  pages.lawyer = await signIn(browser, DEMO.lawyer.email, DEMO_PASSWORD, /\/dashboard\/lawyer/);
  const page = pages.lawyer;
  await page.goto("/dashboard/lawyer/team");
  await page.getByRole("button", { name: "Add assistant" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Email").fill(DEMO.assistant.email);
  await dialog.getByRole("button", { name: "Scheduling" }).click();
  const added = page.waitForResponse((r) => r.url().endsWith("/api/workspace/me/team") && r.request().method() === "POST");
  await dialog.getByRole("button", { name: "Add assistant" }).click();
  const res = await added;
  expect(res.status(), (await res.json()).message).toBeLessThan(300);
  await expect(page.locator("li:not([data-sonner-toast])", { hasText: DEMO.assistant.name })).toBeVisible();
});

test("the assistant confirms the booking", async ({ browser }) => {
  pages.assistant = await signIn(browser, DEMO.assistant.email, DEMO_PASSWORD, /\/dashboard\/staff/);
  const page = pages.assistant;
  await page.getByRole("link", { name: new RegExp(DEMO.lawyer.name) }).click();
  await expect(page).toHaveURL(/\/dashboard\/staff\/lawyers\/[^/]+/);
  await sidebar(page).getByRole("link", { name: "Appointments" }).click();
  await page.locator("tr", { hasText: DEMO.bookingSubject }).getByRole("button", { name: "View" }).click();
  const confirmed = page.waitForResponse((r) => /\/api\/consultations\/[^/]+\/confirm$/.test(r.url()));
  await page.getByRole("button", { name: "Confirm Booking" }).click();
  expect((await confirmed).status()).toBe(200);
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
});

test("the client sees the lawyer's name, never the assistant's", async ({ browser }) => {
  pages.client = await signIn(browser, DEMO.client.email, DEMO_PASSWORD, /\/dashboard\/client/);
  const page = pages.client;
  await page.goto("/dashboard/client/appointments");
  const row = page.locator("tr", { hasText: DEMO.bookingSubject });
  await expect(row).toContainText(DEMO.lawyer.name);
  await expect(row).not.toContainText(DEMO.assistant.name);
  await row.getByRole("button", { name: "View" }).click();
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
  await expect(page.getByText(DEMO.assistant.name)).toHaveCount(0);
});

test("the lawyer's Team activity lists the assistant's action", async () => {
  const page = pages.lawyer!;
  await page.goto("/dashboard/lawyer/team");
  await page.getByRole("tab", { name: "Team activity" }).click();
  await expect(page.getByText(new RegExp(`${DEMO.assistant.name} confirmed the appointment`, "i")).first()).toBeVisible();
});

// ── 3. An assistant without finance access edits a case ────────────────────────
test("an assistant without finance access sees no payments and can save a status", async () => {
  const lawyer = pages.lawyer!;
  await lawyer.goto("/dashboard/lawyer/team");
  await lawyer.locator("li:not([data-sonner-toast])", { hasText: DEMO.assistant.name }).getByRole("button", { name: "Edit" }).click();
  const dialog = lawyer.getByRole("dialog");
  await dialog.getByRole("button", { name: "Case assistant" }).click();
  const saved = lawyer.waitForResponse((r) => /\/api\/workspace\/me\/team\/[^/]+$/.test(r.url()) && r.request().method() === "PATCH");
  await dialog.getByRole("button", { name: "Save" }).click();
  expect((await saved).status()).toBe(200);

  // The new permissions apply on the assistant's next navigation
  const page = pages.assistant!;
  const workspace = page.url().match(/\/dashboard\/staff\/lawyers\/[^/]+/)![0];
  await page.goto(`${workspace}/cases`);
  await expect(sidebar(page).getByRole("link", { name: "Cases" })).toBeVisible();
  await page.locator("tr", { hasText: DEMO.caseTitle }).getByRole("link", { name: "View" }).click();
  await expect(page.getByRole("heading", { name: "Update Case" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Payments & Financial History" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Financials" })).toHaveCount(0);
  await expect(page.getByText("Demo confidential note")).toHaveCount(0);

  await page.locator("#status-select").selectOption("under-review");
  const updated = page.waitForResponse((r) => /\/api\/cases\/[^/]+$/.test(r.url()) && r.request().method() === "PATCH");
  await page.getByRole("button", { name: "Save Changes" }).click();
  const res = await updated;
  expect(res.status(), (await res.json()).message).toBe(200);
  await expect(page.getByText("Case updated successfully.")).toBeVisible();
});

// ── 4. The lawyer removes the assistant ────────────────────────────────────────
test("after removal the assistant's next navigation shows no access", async () => {
  const lawyer = pages.lawyer!;
  await lawyer.goto("/dashboard/lawyer/team");
  await lawyer.locator("li:not([data-sonner-toast])", { hasText: DEMO.assistant.name }).getByRole("button", { name: "Remove" }).click();
  const removed = lawyer.waitForResponse((r) => /\/api\/workspace\/me\/team\/[^/]+$/.test(r.url()) && r.request().method() === "DELETE");
  await lawyer.getByRole("alertdialog").getByRole("button", { name: "Remove assistant" }).click();
  expect((await removed).status()).toBe(200);

  const page = pages.assistant!;
  await sidebar(page).getByRole("link", { name: "Appointments" }).click();
  await expect(noAccess(page)).toBeVisible();
});

// ── 5. Regression: the lawyer's own dashboard and client booking ───────────────
test("lawyer dashboard: cases list → detail → hearing → archive → restore", async () => {
  const page = pages.lawyer!;
  await page.goto("/dashboard/lawyer/cases");
  const row = () => page.locator("tr", { hasText: DEMO.caseTitle });
  await row().getByRole("link", { name: "View" }).click();
  await expect(page.getByRole("heading", { name: "Payments & Financial History" })).toBeVisible();
  const caseId = page.url().split("/").pop()!;

  // The UI has no "add hearing" form; the case API takes hearing entries
  const hearing = `E2E-TEST hearing ${stamp}`;
  const api = await apiAs(page);
  const patched = await api.patch(`/api/cases/${caseId}`, {
    data: { hearingEntry: { date: new Date(Date.now() + 7 * 86_400_000).toISOString(), description: hearing } },
  });
  expect(patched.status(), await patched.text()).toBe(200);
  await api.dispose();
  await page.reload();
  await expect(page.getByText(hearing)).toBeVisible();

  await page.goto("/dashboard/lawyer/cases");
  const archived = page.waitForResponse((r) => r.url().endsWith(`/api/cases/${caseId}/archive`));
  await row().getByRole("button", { name: "Archive" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Archive case" }).click();
  expect((await archived).status()).toBe(200);

  await page.getByRole("tab", { name: /Archived/ }).click();
  const restored = page.waitForResponse((r) => r.url().endsWith(`/api/cases/${caseId}/restore`));
  await row().getByRole("button", { name: "Restore" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Restore" }).click();
  expect((await restored).status()).toBe(200);
  await page.getByRole("tab", { name: /Active/ }).click();
  await expect(row()).toBeVisible();
});

test("client booking still works", async () => {
  const api = await apiAs(pages.client!);
  const listed = await (await api.get("/api/lawyers/public")).json();
  const lawyer = (listed.lawyers as { _id: string; name: string }[]).find((l) => l.name === DEMO.lawyer.name);
  expect(lawyer, "demo lawyer is listed publicly").toBeTruthy();

  let picked: { date: string; time: string } | null = null;
  for (let d = 1; d <= 14 && !picked; d++) {
    const date = new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);
    const slots = await (await api.get(`/api/lawyers/${lawyer!._id}/slots?date=${date}`)).json();
    const free = slots.data?.isAvailable && slots.data.slots.find((s: { available: boolean }) => s.available);
    if (free) picked = { date, time: free.time };
  }
  expect(picked, "demo lawyer has a free slot in the next 14 days").toBeTruthy();
  const booked = await api.post("/api/consultations/book", {
    data: {
      lawyerId: lawyer!._id, consultationType: "initial-consultation", meetingMode: "video",
      date: picked!.date, time: picked!.time,
      subject: `E2E-TEST booking ${stamp}`, description: "Automated end-to-end test booking. Safe to delete.",
    },
  });
  expect(booked.status(), await booked.text()).toBe(201);
  await api.dispose();

  await pages.client!.goto("/dashboard/client/appointments");
  await expect(pages.client!.locator("tr", { hasText: `E2E-TEST booking ${stamp}` })).toContainText(DEMO.lawyer.name);
});
