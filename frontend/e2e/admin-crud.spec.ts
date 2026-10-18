import { expect, request, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";

// Admin CRUD walkthrough. Every record it creates is tagged E2E-TEST / e2e-test
// so it can be found and cleaned up afterwards.
//   E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... npx playwright test
// Appointments need a verified client account (E2E_CLIENT_EMAIL / E2E_CLIENT_PASSWORD),
// because only clients can book.

const WEB = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const API = process.env.E2E_API_URL ?? "http://localhost:5000";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "";
const CLIENT_EMAIL = process.env.E2E_CLIENT_EMAIL ?? "";
const CLIENT_PASSWORD = process.env.E2E_CLIENT_PASSWORD ?? "";

const stamp = Date.now().toString(36);
const lawyer = {
  name: `E2E-TEST Lawyer ${stamp}`,
  email: `e2e-test-lawyer-${stamp}@example.com`,
  phone: "+8801711111111",
  barId: `BC-E2E-${stamp}`,
  specialization: "Testing Law",
};
const blogTitle = `E2E-TEST Blog ${stamp}`;
const blogTitleEdited = `${blogTitle} (edited)`;
const caseTitle = `E2E-TEST Case ${stamp}`;
const appointmentSubject = `E2E-TEST Appointment ${stamp}`;

test.describe.configure({ mode: "serial" });

let page: Page;
let lawyerId = "";
let caseId = "";
let blogId = "";
const apiErrors: string[] = [];
const consoleErrors: string[] = [];

const toast = (text: string | RegExp) => page.locator("[data-sonner-toast]").filter({ hasText: text }).first();
const dialog = () => page.getByRole("alertdialog");
const lawyerCard = () => page.locator("div.rounded-xl.p-4", { hasText: lawyer.email }).first();
const caseCard = () => page.locator("div.rounded-xl.overflow-hidden", { hasText: caseTitle }).first();
const blogCard = (title: string) => page.locator("div.rounded-xl.p-4").filter({ has: page.getByText(title, { exact: true }) }).first();

async function goto(path: string, heading: string | RegExp) {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
}

async function adminApi(): Promise<APIRequestContext> {
  // Reuse the browser's auth cookies for direct API calls
  return request.newContext({
    baseURL: API,
    extraHTTPHeaders: { Origin: WEB },
    storageState: await page.context().storageState(),
  });
}

function note(text: string) {
  test.info().annotations.push({ type: "finding", description: text });
}

test.beforeAll(async ({ browser }) => {
  expect(ADMIN_EMAIL && ADMIN_PASSWORD, "set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD").toBeTruthy();
  page = await browser.newPage();
  page.on("response", (res) => {
    if (res.url().startsWith(API) && res.status() >= 400) {
      apiErrors.push(`${res.request().method()} ${res.url().replace(API, "")} → ${res.status()}`);
    }
  });
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 300)); });
  page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message.slice(0, 300)}`));
});

test.afterAll(async () => {
  console.log("\n=== API responses >= 400 during run ===\n" + (apiErrors.join("\n") || "(none)"));
  console.log("\n=== Browser console errors ===\n" + ([...new Set(consoleErrors)].join("\n") || "(none)"));
  await page?.close();
});

// ── Auth ──────────────────────────────────────────────────────────────────────
test("login: wrong password is rejected", async () => {
  await page.goto("/login");
  await page.getByLabel("Email Address").fill(ADMIN_EMAIL);
  await page.locator('input[autocomplete="current-password"]').fill("definitely-wrong-password");
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText(/invalid|incorrect|wrong/i).first()).toBeVisible();
});

test("login: admin signs in with email + password", async () => {
  await page.goto("/login");
  await page.getByLabel("Email Address").fill(ADMIN_EMAIL);
  await page.locator('input[autocomplete="current-password"]').fill(ADMIN_PASSWORD);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard\/admin/, { timeout: 60_000 });
  // Session survives a reload
  await page.reload();
  await expect(page).toHaveURL(/\/dashboard\/admin/);
});

test("navigation: every admin page loads without an error banner", async () => {
  const pages: [string, RegExp][] = [
    ["/dashboard/admin", /.+/],
    ["/dashboard/admin/appointments", /Appointments/],
    ["/dashboard/admin/cases", /^Cases$/],
    ["/dashboard/admin/lawyers", /Lawyer Management/],
    ["/dashboard/admin/users", /User Management/],
    ["/dashboard/admin/blogs", /Blog Management/],
    ["/dashboard/admin/content", /Website Content/],
    ["/dashboard/admin/settings", /Account Settings/],
  ];
  for (const [path, heading] of pages) {
    await goto(path, heading);
    await page.waitForLoadState("networkidle");
    await expect.soft(page.locator(".bg-error\\/10.p-4"), `${path} shows an error banner`).toHaveCount(0);
  }
});

// ── Lawyers ───────────────────────────────────────────────────────────────────
test("lawyers: required-field validation", async () => {
  await goto("/dashboard/admin/lawyers", "Lawyer Management");
  await page.getByRole("button", { name: "Add Lawyer" }).click();
  await page.getByRole("button", { name: "Create Lawyer Account" }).click();
  await expect(page.getByText("Name, email, phone, and Bar ID are required.")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
});

test("lawyers: CREATE", async () => {
  await page.getByRole("button", { name: "Add Lawyer" }).click();
  await page.getByPlaceholder("Lawyer's full name").fill(lawyer.name);
  await page.getByPlaceholder("lawyer@islamassociates.com").fill(lawyer.email);
  await page.getByPlaceholder("+8801XXXXXXXXX").fill(lawyer.phone);
  await page.getByPlaceholder("BC-XXXX").fill(lawyer.barId);
  await page.getByPlaceholder("e.g. Immigration & Corporate Law").fill(lawyer.specialization);
  const created = page.waitForResponse((r) => r.url().endsWith("/api/admin/lawyers") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Create Lawyer Account" }).click();
  const res = await created;
  const body = await res.json();
  expect(res.status(), body.message).toBe(201);
  if (body.emailSent === false) note(`Lawyer created but invitation email was not sent: ${body.message}`);
  await expect(page.getByRole("heading", { name: "Add New Lawyer" })).toBeHidden();
  await expect(lawyerCard()).toBeVisible();
  await expect(lawyerCard()).toContainText("Verified"); // admin-added lawyers start verified
  await expect(lawyerCard()).toContainText(lawyer.barId);

  const api = await adminApi();
  const list = await (await api.get("/api/admin/lawyers")).json();
  lawyerId = list.data.find((l: { email: string }) => l.email === lawyer.email)?._id;
  expect(lawyerId).toBeTruthy();
  await api.dispose();
});

test("lawyers: duplicate email is rejected", async () => {
  await page.getByRole("button", { name: "Add Lawyer" }).click();
  await page.getByPlaceholder("Lawyer's full name").fill(`${lawyer.name} dup`);
  await page.getByPlaceholder("lawyer@islamassociates.com").fill(lawyer.email);
  await page.getByPlaceholder("+8801XXXXXXXXX").fill(lawyer.phone);
  await page.getByPlaceholder("BC-XXXX").fill(`${lawyer.barId}-2`);
  await page.getByRole("button", { name: "Create Lawyer Account" }).click();
  await expect(page.locator(".text-error.text-xs").filter({ hasText: /exist|already|registered|in use/i })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
});

test("lawyers: READ details modal", async () => {
  await lawyerCard().getByRole("button", { name: "View Details" }).click();
  const modal = page.locator("div.fixed", { has: page.getByRole("heading", { name: "Lawyer Details" }) });
  await expect(modal).toContainText(lawyer.email);
  await expect(modal).toContainText(lawyer.phone);
  await expect(modal).toContainText(lawyer.barId);
  await expect(modal).toContainText("Total Cases");
  await page.getByRole("button", { name: "Close details" }).click();
  await expect(modal).toBeHidden();
});

test("lawyers: UPDATE verification (unverify → verify)", async () => {
  await lawyerCard().getByRole("button", { name: "Unverify" }).click();
  await expect(toast("Lawyer verification removed")).toBeVisible();
  await expect(lawyerCard()).toContainText("Pending");
  await page.reload();
  await expect(lawyerCard()).toContainText("Pending"); // persisted
  await lawyerCard().getByRole("button", { name: "Verify" }).click();
  await expect(toast("Lawyer verified")).toBeVisible();
  await expect(lawyerCard()).toContainText("Verified");
  await page.reload();
  await expect(lawyerCard()).toContainText("Verified"); // persisted
  // There is no edit form for name/phone/Bar ID/specialization on this page
  const hasEdit = await lawyerCard().getByRole("button", { name: /edit/i }).count();
  if (!hasEdit) note("Lawyers: no UI to edit an existing lawyer's name/email/phone/Bar ID/specialization (only verify toggle).");
});

// ── Blogs ─────────────────────────────────────────────────────────────────────
test("blogs: required-field validation", async () => {
  await goto("/dashboard/admin/blogs", "Blog Management");
  await page.getByRole("button", { name: "New Blog Post" }).click();
  await page.getByRole("button", { name: "Save Draft" }).click();
  await expect(page.getByText("Title and excerpt are required.")).toBeVisible();
});

test("blogs: CREATE draft with content blocks", async () => {
  await page.getByPlaceholder("e.g. Understanding Immigration Law in Bangladesh").fill(blogTitle);
  await page.getByPlaceholder(/Brief summary/).fill("Automated end-to-end test post. Safe to delete.");
  await page.getByLabel(/Category/).selectOption("legal-tips");
  await page.getByPlaceholder("visa, immigration, tips").fill("e2e, test");
  await page.getByTitle("Heading 2").click();
  await page.getByPlaceholder("Heading 2…").fill("E2E heading");
  await page.getByTitle("Paragraph").click();
  await page.getByPlaceholder("Write your paragraph…").fill("E2E paragraph body text.");
  await page.getByTitle("Bullet list").click();
  await page.getByPlaceholder("Item 1").fill("First item");
  const saved = page.waitForResponse((r) => r.url().endsWith("/api/blogs") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Save Draft" }).click();
  const res = await saved;
  const body = await res.json();
  expect(res.status(), body.message).toBeLessThan(300);
  blogId = body.data._id;
  await expect(toast("Blog post saved")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Edit Blog Post" })).toBeVisible();

  await page.getByRole("button", { name: "Back to Blogs" }).click();
  await expect(blogCard(blogTitle)).toBeVisible();
  await expect(blogCard(blogTitle)).toContainText("draft");
});

test("blogs: draft is not public", async () => {
  const api = await request.newContext({ baseURL: API });
  const list = await (await api.get("/api/blogs?limit=100")).json();
  const found = JSON.stringify(list).includes(blogTitle);
  expect(found, "draft blog must not appear in public listing").toBe(false);
  await api.dispose();
});

test("blogs: UPDATE title + content, then publish", async () => {
  await blogCard(blogTitle).getByRole("button", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { name: "Edit Blog Post" })).toBeVisible();
  // Saved blocks came back
  await expect(page.getByPlaceholder("Heading 2…")).toHaveValue("E2E heading");
  await expect(page.getByPlaceholder("Item 1")).toHaveValue("First item");
  await page.getByPlaceholder("e.g. Understanding Immigration Law in Bangladesh").fill(blogTitleEdited);
  await page.getByPlaceholder("Write your paragraph…").fill("E2E paragraph — edited.");
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(toast("Blog post published")).toBeVisible();
  await page.getByRole("button", { name: "Back to Blogs" }).click();
  await expect(blogCard(blogTitleEdited)).toContainText("published");
});

test("blogs: published post is public and renders", async () => {
  const api = await request.newContext({ baseURL: API });
  const list = await (await api.get("/api/blogs?limit=100")).json();
  const posts: { title: string; slug: string }[] = list.data ?? [];
  const post = posts.find((p) => p.title === blogTitleEdited);
  expect(post, "published blog in public API").toBeTruthy();
  await api.dispose();
  if (post) {
    await page.goto(`/blogs/${post.slug}`);
    await expect(page.getByRole("heading", { name: blogTitleEdited })).toBeVisible();
    await expect(page.getByText("E2E paragraph — edited.")).toBeVisible();
  }
});

test("blogs: archive hides the post", async () => {
  await goto("/dashboard/admin/blogs", "Blog Management");
  await blogCard(blogTitleEdited).getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Archive" }).click();
  await expect(toast("Blog post saved")).toBeVisible();
  await page.getByRole("button", { name: "Back to Blogs" }).click();
  await expect(blogCard(blogTitleEdited)).toContainText("archived");
  const api = await request.newContext({ baseURL: API });
  const list = await (await api.get("/api/blogs?limit=100")).json();
  expect(JSON.stringify(list).includes(blogTitleEdited), "archived blog must not be public").toBe(false);
  await api.dispose();
});

test("blogs: DELETE (cancel keeps it, confirm removes it)", async () => {
  await blogCard(blogTitleEdited).locator("button").last().click();
  await expect(dialog()).toContainText(blogTitleEdited);
  await dialog().getByRole("button", { name: "Cancel" }).click();
  await expect(blogCard(blogTitleEdited)).toBeVisible();

  await blogCard(blogTitleEdited).locator("button").last().click();
  await dialog().getByRole("button", { name: "Delete" }).click();
  await expect(toast("Blog post deleted")).toBeVisible();
  await page.reload();
  await expect(page.getByText(blogTitleEdited, { exact: true })).toHaveCount(0);
  const api = await adminApi();
  expect((await api.get(`/api/blogs/admin/${blogId}`)).status()).toBe(404);
  await api.dispose();
});

// ── Cases ─────────────────────────────────────────────────────────────────────
test("cases: required-field validation", async () => {
  await goto("/dashboard/admin/cases", /^Cases$/);
  await page.getByRole("button", { name: "Add Case" }).click();
  await page.getByRole("button", { name: "Create Case" }).click();
  await expect(page.getByText("Please fill all required fields.")).toBeVisible();
});

test("cases: CREATE", async () => {
  await page.getByPlaceholder("Brief case title").fill(caseTitle);
  await page.getByPlaceholder("Full name").fill("E2E-TEST Client");
  await page.getByPlaceholder("client@email.com").fill(CLIENT_EMAIL || "e2e-test-client@example.com");
  await page.getByLabel(/Assign Lawyer/).selectOption(lawyerId);
  await page.getByLabel(/Case Type/).selectOption("corporate");
  await page.getByPlaceholder("Describe the case...").fill("Automated end-to-end test case. Safe to delete.");
  await page.getByLabel(/Next Court Date/).fill("2026-12-15");
  await page.getByPlaceholder("Additional notes...").fill("E2E note");
  await page.getByRole("button", { name: "Create Case" }).click();
  await expect(page.getByRole("heading", { name: "Add New Case" })).toBeHidden();
  await expect(toast(/case/i)).toBeVisible();
  await expect(caseCard()).toBeVisible();
  await expect(caseCard()).toContainText(lawyer.name);
  await expect(caseCard()).toContainText("active");
  await expect(caseCard().locator(".font-mono")).toHaveText(/\S+/); // case number assigned

  const api = await adminApi();
  const list = await (await api.get("/api/admin/cases")).json();
  caseId = list.data.find((c: { title: string }) => c.title === caseTitle)?._id;
  expect(caseId).toBeTruthy();
  await api.dispose();
});

test("cases: READ expanded details", async () => {
  await caseCard().getByRole("button", { name: "Toggle details" }).click();
  await expect(caseCard()).toContainText("Automated end-to-end test case.");
  await expect(caseCard()).toContainText(lawyer.barId);
  await expect(caseCard()).toContainText("15 Dec 2026");
  await expect(caseCard()).toContainText("E2E note");
});

test("cases: UPDATE total fee + record and delete a payment", async () => {
  const card = caseCard();
  await card.getByRole("button", { name: "Edit", exact: true }).click();
  await card.getByTitle("Edit Total Payment").fill("50000");
  await card.getByRole("button", { name: "Save", exact: true }).click();
  await expect(toast("Total payment updated")).toBeVisible();
  await expect(card).toContainText("৳50,000");

  await card.getByLabel("Amount (৳)").fill("10000");
  await card.getByPlaceholder("e.g. Cash / Bank transfer").fill("E2E cash payment");
  await card.getByRole("button", { name: "Record Payment" }).click();
  await expect(toast("Payment recorded")).toBeVisible();
  const row = card.locator("tr", { hasText: "E2E cash payment" });
  await expect(row).toBeVisible();
  await expect(card.locator("div", { hasText: /^Remaining Balance:/ }).last()).toContainText("৳40,000");

  // Persisted after reload
  await page.reload();
  await caseCard().getByRole("button", { name: "Toggle details" }).click();
  await expect(caseCard().locator("tr", { hasText: "E2E cash payment" })).toBeVisible();

  await caseCard().locator("tr", { hasText: "E2E cash payment" }).getByRole("button", { name: "Delete" }).click();
  await dialog().getByRole("button", { name: "Delete" }).click();
  await expect(toast("Payment entry deleted")).toBeVisible();
  await expect(caseCard().locator("tr", { hasText: "E2E cash payment" })).toHaveCount(0);
  await expect(caseCard()).toContainText("No payments recorded yet.");
});

test("cases: UPDATE status + status filter", async () => {
  const card = caseCard();
  await card.getByRole("button", { name: "hearing scheduled", exact: true }).click();
  await expect(toast("Case status updated")).toBeVisible();
  await expect(card.locator("span.rounded-full").first()).toHaveText(/hearing scheduled/i);
  await card.getByRole("button", { name: "closed", exact: true }).click();
  await expect(toast("Case status updated")).toBeVisible();

  await page.reload();
  await expect(caseCard().locator("span.rounded-full").first()).toHaveText(/closed/i);
  await page.locator("div.flex.flex-wrap.gap-2 > button", { hasText: /^closed$/ }).first().click();
  await expect(caseCard()).toBeVisible();
  await page.locator("div.flex.flex-wrap.gap-2 > button", { hasText: /^won$/ }).first().click();
  await expect(page.getByText(caseTitle)).toHaveCount(0);
  await page.locator("div.flex.flex-wrap.gap-2 > button", { hasText: /^all$/ }).first().click();
  await expect(caseCard()).toBeVisible();
  // Put it back to active for later steps
  await caseCard().getByRole("button", { name: "Toggle details" }).click();
  await caseCard().getByRole("button", { name: "active", exact: true }).click();
  await expect(toast("Case status updated")).toBeVisible();
});

test("cases: other fields are not editable in admin UI", async () => {
  const hasEdit = await caseCard().getByRole("button", { name: /edit case|edit details/i }).count();
  if (!hasEdit) note("Cases: no UI to edit title/description/client/lawyer/type/court date/notes after creation (only status + payments).");
  const hasDelete = await caseCard().getByRole("button", { name: /delete case|remove case/i }).count();
  if (!hasDelete) note("Cases: no Delete button in admin UI, although the API supports DELETE /api/cases/:id for admins.");
});

// ── Appointments ──────────────────────────────────────────────────────────────
test("appointments: client books with the test lawyer (setup via API)", async () => {
  test.skip(!CLIENT_EMAIL || !CLIENT_PASSWORD, "no E2E client credentials");
  const client = await request.newContext({ baseURL: API, extraHTTPHeaders: { Origin: WEB } });
  const login = await client.post("/api/auth/login", { data: { email: CLIENT_EMAIL, password: CLIENT_PASSWORD } });
  expect(login.status(), await login.text()).toBe(200);

  let picked: { date: string; time: string } | null = null;
  for (let d = 1; d <= 14 && !picked; d++) {
    const date = new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);
    const slots = await (await client.get(`/api/lawyers/${lawyerId}/slots?date=${date}`)).json();
    const free = slots.data?.isAvailable && slots.data.slots.find((s: { available: boolean }) => s.available);
    if (free) picked = { date, time: free.time };
  }
  expect(picked, "lawyer has a free slot in the next 14 days").toBeTruthy();

  const payload = {
    lawyerId, consultationType: "initial-consultation", meetingMode: "video",
    date: picked!.date, time: picked!.time,
    subject: appointmentSubject, description: "Automated end-to-end test booking. Safe to delete.",
  };
  const booked = await client.post("/api/consultations/book", { data: payload });
  expect(booked.status(), await booked.text()).toBe(201);
  // Double-booking guard
  const again = await client.post("/api/consultations/book", { data: payload });
  expect(again.status()).toBe(409);
  await client.dispose();
});

test("appointments: admin READ + UPDATE status", async () => {
  test.skip(!CLIENT_EMAIL || !CLIENT_PASSWORD, "no E2E client credentials");
  await goto("/dashboard/admin/appointments", "Appointments");
  const card = page.locator("div.rounded-xl.overflow-hidden", { hasText: lawyer.name }).first();
  await expect(card).toBeVisible();
  await expect(card).toContainText("scheduled");
  await card.getByRole("button", { name: "Toggle details" }).click();
  await expect(card).toContainText(appointmentSubject);
  await expect(card).toContainText("Initial Consultation");

  for (const status of ["completed", "cancelled", "rescheduled", "scheduled"]) {
    await card.getByRole("button", { name: status, exact: true }).click();
    await expect(toast(`Appointment marked ${status}`)).toBeVisible();
    await expect(card.locator("span.rounded-full").first()).toHaveText(status);
  }
  await page.reload();
  await expect(page.locator("div.rounded-xl.overflow-hidden", { hasText: lawyer.name }).first().locator("span.rounded-full").first()).toHaveText("scheduled");

  // Status filter
  await page.locator("div.flex.flex-wrap.gap-2 > button", { hasText: /^cancelled$/ }).click();
  await expect(page.locator("div.rounded-xl.overflow-hidden", { hasText: lawyer.name })).toHaveCount(0);
  await page.locator("div.flex.flex-wrap.gap-2 > button", { hasText: /^scheduled$/ }).click();
  await expect(page.locator("div.rounded-xl.overflow-hidden", { hasText: lawyer.name }).first()).toBeVisible();
  note("Appointments: admin can only change status — no create, reschedule (date/time), edit or delete in the admin UI or API.");
});

// ── Users ─────────────────────────────────────────────────────────────────────
test("users: READ client list", async () => {
  await goto("/dashboard/admin/users", "User Management");
  if (CLIENT_EMAIL) await expect(page.locator("tr", { hasText: CLIENT_EMAIL })).toContainText("Verified");
  note("Users: read-only list — no create, edit, deactivate or delete for client accounts.");
});

// ── Website content (CMS) ─────────────────────────────────────────────────────
test("content: UPDATE draft → persists → discard restores (live site untouched)", async () => {
  await goto("/dashboard/admin/content", "Website Content");
  const cards = page.locator("div.rounded-xl.p-4", { has: page.getByRole("link", { name: "Edit" }) });
  await expect(cards.first()).toBeVisible();
  const n = await cards.count();
  let target: Locator | null = null;
  for (let i = 0; i < n; i++) {
    const text = await cards.nth(i).innerText();
    // Never touch a page that already has someone's unpublished draft
    if (!text.includes("Unpublished changes") && !text.includes("Site Settings")) { target = cards.nth(i); break; }
  }
  expect(target, "a content page without pending drafts").toBeTruthy();
  const title = (await target!.locator("p.font-semibold").first().innerText()).trim();
  await target!.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  const field = page.locator('main input[lang="en"], main textarea[lang="en"]').first();
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill(`E2E-TEST draft text ${stamp}`);
  await expect(page.getByText("Unsaved changes")).toBeVisible();
  await page.getByRole("button", { name: "Save Draft" }).click();
  await expect(toast(/Draft saved/)).toBeVisible();

  await page.reload();
  await expect(page.locator('main input[lang="en"], main textarea[lang="en"]').first()).toHaveValue(`E2E-TEST draft text ${stamp}`);
  await expect(page.getByText(/not published yet/)).toBeVisible();

  // Draft must not leak to the public API
  const pub = await request.newContext({ baseURL: API });
  const live = await (await pub.get("/api/content")).text();
  expect(live.includes(`E2E-TEST draft text ${stamp}`), "draft must not be live").toBe(false);
  await pub.dispose();

  await page.getByRole("button", { name: "History" }).click();
  await expect(page.getByRole("button", { name: "History" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Discard" }).click();
  await dialog().getByRole("button", { name: "Discard" }).click();
  await expect(toast("Changes discarded")).toBeVisible();
  await page.reload();
  await expect(page.locator('main input[lang="en"], main textarea[lang="en"]').first()).toHaveValue(original);
  await expect(page.getByText(/not published yet/)).toHaveCount(0);
  note(`Content: tested on "${title}". Publish was NOT exercised to avoid changing the live site.`);
});

// ── Delete lawyer last (cases/appointments reference it) ─────────────────────
test("lawyers: DELETE (warning lists impact, needs email typed, cancel keeps it)", async () => {
  await goto("/dashboard/admin/lawyers", "Lawyer Management");
  await lawyerCard().getByTitle("Delete lawyer").click();
  await expect(dialog()).toContainText(lawyer.name);
  await expect(dialog()).toContainText(/archive/i);
  await dialog().getByRole("button", { name: "Cancel" }).click();
  await expect(lawyerCard()).toBeVisible();

  await lawyerCard().getByTitle("Delete lawyer").click();
  const confirm = dialog().getByRole("button", { name: "Delete lawyer" });
  await expect(confirm).toBeDisabled();
  await dialog().getByRole("textbox").fill(lawyer.email);
  await confirm.click();
  await expect(toast(`${lawyer.name} was removed`)).toBeVisible();
  await page.reload();
  await expect(page.getByText(lawyer.email)).toHaveCount(0);
});

test("integrity: deleted lawyer's case is archived and appointment cancelled", async () => {
  const api = await adminApi();
  const archived = await (await api.get("/api/admin/cases?archived=true&limit=200")).json();
  const moved = (archived.data ?? []).find((c: { _id: string }) => c._id === caseId);
  expect(moved, "case should be in the archive").toBeTruthy();
  expect(moved.archiveReason).toBe("lawyer-deleted");
  expect(moved.formerLawyer?.name).toBe(lawyer.name);

  if (CLIENT_EMAIL) {
    const list = await (await api.get("/api/admin/consultations")).json();
    const appt = (list.data ?? []).find((c: { subject?: string }) => c.subject === appointmentSubject);
    if (appt) expect(appt.status).toBe("cancelled");
  }
  await api.dispose();

  await goto("/dashboard/admin/cases", /^Cases$/);
  await page.getByRole("tab", { name: /Archived/ }).click();
  await expect(caseCard()).toContainText(/Lawyer deleted/i);
});

test("cases: DELETE an archived case via admin API", async () => {
  const api = await adminApi();
  const res = await api.delete(`/api/admin/cases/${caseId}`);
  expect(res.status(), await res.text()).toBe(200);
  await api.dispose();
  await page.reload();
  await expect(page.getByText(caseTitle)).toHaveCount(0);
});

test("settings + logout", async () => {
  await goto("/dashboard/admin/settings", "Account Settings");
  await expect(page.getByText(`(${ADMIN_EMAIL})`)).toBeVisible();
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).not.toHaveURL(/\/dashboard/);
  await page.goto("/dashboard/admin");
  await expect(page).toHaveURL(/\/login/); // protected after logout
});
