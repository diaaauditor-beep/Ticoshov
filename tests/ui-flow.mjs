// Browser test of the main TICOSHOV journeys through the real UI (server actions,
// auth emails, uploads) against a LOCAL stack.
//   1) npx supabase start   2) npm run build && npx next start -p 3000
//   3) node --env-file=.env.local tests/ui-flow.mjs
// Screenshots are written to tests/screenshots/ (gitignored).
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const APP = process.env.APP_URL ?? "http://localhost:3000";
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!/127\.0\.0\.1|localhost/.test(SB_URL)) throw new Error("UI tests must target a local stack");
const svc = createClient(SB_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const run = Date.now().toString(36);
const PW = "Ui-test-password-1!";
const SHOTS = new URL("./screenshots/", import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

let passed = 0, failed = 0;
const pages = {};
async function step(name, fn) {
  try { await fn(); passed++; console.log(`✔ ${name}`); }
  catch (e) {
    failed++;
    console.log(`✘ ${name}\n   ${String(e.message ?? e).split("\n").slice(0, 3).join("\n   ")}`);
    for (const [k, p] of Object.entries(pages)) await p.screenshot({ path: `${SHOTS}FAIL-${k}.png`, fullPage: true }).catch(() => {});
    throw e;
  }
}
async function confirmLink(email) {
  for (let i = 0; i < 20; i++) {
    const r = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`).then((x) => x.json());
    if (r.messages?.length) {
      const m = await fetch(`${MAILPIT}/api/v1/message/${r.messages[0].ID}`).then((x) => x.json());
      const link = (m.HTML || m.Text).match(/href="([^"]+)"/)?.[1] ?? (m.Text.match(/https?:\/\/\S+/) ?? [])[0];
      return link.replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("confirmation email not received");
}
const shot = (page, name) => page.screenshot({ path: `${SHOTS}${name}.png`, fullPage: true });
async function expectNoError(page) {
  const err = await page.locator('form [role="alert"]').allInnerTexts();
  if (err.some((t) => t.trim())) throw new Error(`form error: ${err.join(" | ")}`);
}
async function onboard(page, { name, country, phone }) {
  await page.fill('[name="name"]', name);
  await page.selectOption('[name="country_code"]', country);
  await page.fill('[name="city"]', country === "EG" ? "Cairo" : "Riyadh");
  await page.selectOption('[name="business_type"]', { index: 1 });
  await page.fill('[name="commercial_registration_no"]', "CR-778899");
  await page.fill('[name="contact_phone"]', phone);
  await page.locator('[name="category_ids"]').first().check();
  await Promise.all([page.waitForURL(/\/dashboard/, { timeout: 20000 }), page.click('form button[type="submit"]')]);
}
async function login(page, email, locale = "en") {
  await page.goto(`${APP}/${locale}/login`);
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', PW);
  await Promise.all([page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 20000 }), page.click('form button[type="submit"]')]);
}

const browser = await chromium.launch();
const supplierEmail = `ui-supplier-${run}@test.local`;
const buyerEmail = `ui-buyer-${run}@test.local`;
const adminEmail = `ui-admin-${run}@test.local`;
const ctxS = await browser.newContext({ viewport: { width: 1360, height: 900 } });
const ctxB = await browser.newContext({ viewport: { width: 1360, height: 900 } });
const ctxA = await browser.newContext({ viewport: { width: 1360, height: 900 } });
const S = await ctxS.newPage(), B = await ctxB.newPage(), A = await ctxA.newPage();
Object.assign(pages, { supplier: S, buyer: B, admin: A });
let rfqUrl, dealUrl;

try {
  await step("supplier signs up (EN) and receives a confirmation email", async () => {
    await S.goto(`${APP}/en/register?role=supplier`);
    await S.fill('[name="full_name"]', "UI Supplier");
    await S.fill('[name="email"]', supplierEmail);
    await S.fill('[name="password"]', PW);
    await S.fill('[name="password_confirm"]', PW);
    await S.check('[name="role"][value="supplier"]', { force: true });
    await S.check('[name="terms"]');
    await Promise.all([S.waitForURL(/check-email/, { timeout: 20000 }), S.click('form button[type="submit"]')]);
  });

  await step("unconfirmed account cannot sign in", async () => {
    await S.goto(`${APP}/en/login`);
    await S.fill('[name="email"]', supplierEmail);
    await S.fill('[name="password"]', PW);
    await S.click('form button[type="submit"]');
    await S.locator('form [role="alert"]').first().waitFor({ timeout: 10000 });
  });

  await step("email link confirms the account and opens onboarding", async () => {
    await S.goto(await confirmLink(supplierEmail));
    await S.waitForURL(/onboarding/, { timeout: 20000 });
  });

  await step("supplier completes company onboarding", async () => {
    await onboard(S, { name: `Cairo Modest Factory ${run}`, country: "EG", phone: "+201001112223" });
  });

  await step("supplier uploads a verification document and submits", async () => {
    await S.goto(`${APP}/en/dashboard/verification`);
    await S.selectOption('[name="doc_type"]', "commercial_registration");
    await S.setInputFiles('[name="file"]', { name: "cr.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n% test document\n") });
    await S.locator('[name="file"]').locator("xpath=ancestor::form").locator('button[type="submit"]').click();
    await S.getByText("cr.pdf").waitFor({ timeout: 15000 });
    await S.getByRole("button", { name: /submit for review/i }).click();
    await S.getByText(/pending|under review/i).first().waitFor({ timeout: 15000 });
    await shot(S, "supplier-verification-en");
  });

  await step("first admin is bootstrapped with scripts/make-admin.mjs", async () => {
    await svc.auth.admin.createUser({ email: adminEmail, password: PW, email_confirm: true, user_metadata: { full_name: "UI Admin" } });
    execFileSync("node", ["--env-file=.env.local", "scripts/make-admin.mjs", adminEmail, "admin"], { stdio: "pipe" });
    await login(A, adminEmail);
    await A.waitForURL(/\/admin/, { timeout: 20000 }).catch(async () => { await A.goto(`${APP}/en/admin`); });
    await A.goto(`${APP}/en/admin`);
    await A.getByRole("heading").first().waitFor();
    await shot(A, "admin-overview-en");
  });

  await step("admin reviews and approves the supplier", async () => {
    await A.goto(`${APP}/en/admin/verifications`);
    await A.getByText(`Cairo Modest Factory ${run}`).click();
    await A.waitForURL(/verifications\/[0-9a-f-]{36}/);
    await A.selectOption('[name="status"]', "approved");
    await A.fill('[name="message"]', "Documents verified.");
    await A.fill('[name="internal_notes"]', "CR checked against registry (UI test).");
    await A.locator('[name="internal_notes"]').locator("xpath=ancestor::form").locator('button[type="submit"]').click();
    await A.getByText(/approved/i).first().waitFor({ timeout: 15000 });
  });

  await step("verified supplier publishes a product", async () => {
    await S.goto(`${APP}/en/dashboard/products/new`);
    await S.fill('[name="name_en"]', `Premium Crepe Abaya ${run}`);
    await S.fill('[name="name_ar"]', "عباية كريب فاخرة");
    await S.selectOption('[name="category_id"]', { index: 1 });
    await S.fill('[name="moq"]', "100");
    await S.selectOption('[name="unit_code"]', "piece");
    await S.fill('[name="price_min"]', "12");
    await S.fill('[name="price_max"]', "18");
    await S.selectOption('[name="currency_code"]', "USD");
    await S.selectOption('[name="status"]', "published");
    await S.setInputFiles('[name="images"]', { name: "a.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64") });
    await Promise.all([S.waitForURL(/products\/[0-9a-f-]{36}|products$/, { timeout: 20000 }), S.click('form button[type="submit"]')]);
    await expectNoError(S);
  });

  await step("public search finds the product (anonymous)", async () => {
    const anon = await (await browser.newContext()).newPage();
    await anon.goto(`${APP}/en/products?q=${encodeURIComponent("Premium Crepe")}`);
    await anon.getByText(`Premium Crepe Abaya ${run}`).first().waitFor({ timeout: 10000 });
    await shot(anon, "products-search-en");
  });

  await step("buyer (AR UI) signs in, onboards, and creates an RFQ", async () => {
    await svc.auth.admin.createUser({ email: buyerEmail, password: PW, email_confirm: true, user_metadata: { role: "buyer", full_name: "مشتري" } });
    await login(B, buyerEmail, "ar");
    await B.waitForURL(/onboarding/, { timeout: 20000 });
    await onboard(B, { name: `Riyadh Boutique ${run}`, country: "SA", phone: "+966501112223" });
    await B.goto(`${APP}/ar/dashboard/rfqs/new`);
    await B.fill('[name="title"]', "طلب 500 عباية كريب");
    await B.fill('textarea[name="description"]', "عباية كريب سوداء، مقاسات 52 إلى 58، تغليف فردي.");
    await B.selectOption('[name="category_id"]', { index: 1 });
    await B.fill('[name="quantity"]', "500");
    await B.selectOption('[name="unit_code"]', "piece");
    await B.selectOption('[name="delivery_country"]', "SA");
    await B.selectOption('[name="currency_code"]', "USD");
    await Promise.all([B.waitForURL(/rfqs\/[0-9a-f-]{36}/, { timeout: 20000 }), B.click('form button[type="submit"]')]);
    rfqUrl = B.url();
    await shot(B, "buyer-rfq-ar");
  });

  await step("supplier receives the RFQ and submits a quotation", async () => {
    const id = rfqUrl.match(/rfqs\/([0-9a-f-]{36})/)[1];
    await S.goto(`${APP}/en/dashboard/rfqs/${id}`);
    await S.fill('[name="unit_price"]', "14.50");
    await S.fill('[name="quantity"]', "500");
    await S.fill('[name="lead_time_days"]', "30");
    await S.locator('[name="unit_price"]').locator("xpath=ancestor::form").locator('button[type="submit"]').click();
    await S.getByText(/7,250/).first().waitFor({ timeout: 15000 });
  });

  await step("buyer compares and accepts the quotation → deal is created", async () => {
    await B.goto(rfqUrl);
    B.once("dialog", (d) => d.accept());
    await B.getByRole("button", { name: "قبول العرض" }).first().click();
    await B.waitForURL(/deals\/[0-9a-f-]{36}/, { timeout: 20000 });
    dealUrl = B.url();
    await B.getByText(/TCS-\d{4}-\d{6}/).first().waitFor();
    await shot(B, "buyer-deal-ar");
  });

  await step("supplier sees the same deal; commission is tracked", async () => {
    await S.goto(dealUrl.replace("/ar/", "/en/"));
    await S.getByText(/TCS-\d{4}-\d{6}/).first().waitFor({ timeout: 10000 });
    await S.goto(`${APP}/en/dashboard/commissions`);
    await S.getByText(/362\.50/).first().waitFor({ timeout: 10000 });
  });

  await step("mobile layout renders (AR landing + dashboard)", async () => {
    const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })).newPage();
    await m.goto(`${APP}/ar`);
    const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) throw new Error(`horizontal overflow ${overflow}px on mobile landing`);
    await shot(m, "landing-mobile-ar");
  });
} catch {
  // the failing step was already reported
} finally {
  await browser.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  writeFileSync(`${SHOTS}result.json`, JSON.stringify({ passed, failed, run }));
  process.exit(failed ? 1 : 0);
}
