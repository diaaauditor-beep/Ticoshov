# TICOSHOV · تيكوشوف

**Connecting Businesses. Enabling Global Trade.**

TICOSHOV is a bilingual (Arabic RTL / English LTR) B2B trade marketplace that connects verified
suppliers with business buyers. It is an **intermediary only**: it holds no inventory, does not buy or
resell goods, and never collects or holds the value of goods. Buyers and suppliers pay each other
directly. TICOSHOV earns a commission on completed deals; the commission is **tracked** on the platform
and settled separately. It is never charged automatically.

The first trade corridor is Egypt → Saudi Arabia, starting with modest wear (abayas, khimar, niqab,
Islamic dresses, scarves & hijabs). Everything is data-driven, so new countries, currencies,
categories and units are added from the admin console without code changes.

| | |
|---|---|
| Frontend | Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript, Tailwind CSS v4 |
| Backend | Supabase: Auth, Postgres with Row Level Security, Storage |
| Security | Every permission is enforced **in the database** (RLS + guarded `SECURITY DEFINER` workflow functions). The UI checks are convenience only. |

---

## Feature overview

- **Accounts & onboarding.** Supplier / buyer sign-up with email confirmation and company onboarding.
  Admin and operations roles can only be granted by an administrator.
- **Company profiles.** Public business profile plus a private legal record (registration and tax
  numbers, contacts, address) visible only to the company and staff.
- **Supplier verification.** Document upload to private storage, then submit → under review →
  approved / needs documents / rejected. Includes a verified badge and a staff-only internal notes table.
- **Catalog.** Nested categories, free-form specifications (no clothing-specific hard-coded fields),
  images, MOQ, price range, lead time, and export countries.
- **Search.** Postgres full-text plus trigram search, with filters for category, country, price,
  MOQ and verified suppliers.
- **RFQs & quotations.**
  - Open or targeted RFQs. Matching verified suppliers are notified.
  - Quotations with line items, attachments and validity, plus a side-by-side comparison for buyers.
  - Competitors never see each other's quotes.
- **Negotiation & messaging.** Per-RFQ/supplier conversations with attachments, user reports, and
  staff moderation (hide or lock).
- **Deals.** An 11-status lifecycle with a server-enforced transition matrix and full status
  history. Payment confirmation is a **declaration by both parties**; TICOSHOV does not verify it.
- **Shipping & documents.** Shipment tracking, trade-document uploads, and an indicative document
  checklist per corridor. No compliance claims are made.
- **Commissions.** Rates resolve in this order: supplier rule, buyer rule, category (including the
  parent category), country, then the platform default (5%, within the 3–8% guideline). Commissions
  become due on completion and are waived on cancellation. The supplier reports a payment and an
  **administrator** confirms it. Overdue tracking is included.
- **Disputes.** Either party can open a dispute, which freezes the deal. Staff resolve it by resuming
  the deal, marking it completed, or cancelling it.
- **Reviews, notifications, admin dashboard and audit log.**
  - Reviews are allowed after completion.
  - Notifications are in-app.
  - The admin dashboard has KPIs, filters and charts, with money grouped by currency and never
    converted.
  - An audit-log trigger covers 21 tables, and admin actions are logged.
- **Legal templates** (AR/EN). Terms, privacy, intermediary disclosure, commission agreement and
  dispute procedure. All are **drafts pending professional legal review** (see
  [docs/LEGAL_REVIEW.md](docs/LEGAL_REVIEW.md)).

## Repository layout

```
src/app/[locale]/        pages (ar | en): landing, (auth), (public), onboarding, dashboard/*, admin/*
src/app/actions/         server actions (auth, company, products, trade, admin)
src/app/auth/, files/    email-confirmation & sign-out routes; signed-URL file proxy
src/components/          UI primitives, forms, DealView, Conversation, charts …
src/i18n/                dictionaries (en.ts defines the type, ar.ts must match it)
src/lib/                 Supabase clients, auth helpers, validation (zod), formatting, storage
src/proxy.ts             locale routing + session refresh + route protection (Next 16 "proxy")
supabase/migrations/     schema, RLS, workflows, storage, reference data (source of truth)
scripts/                 make-admin.mjs (first admin), seed-demo.mjs (optional, flagged demo data)
tests/                   e2e-rls.test.mjs (database/RLS), ui-flow.mjs (browser)
docs/                    DATABASE.md, TESTING_REPORT.md, LEGAL_REVIEW.md
```

---

## Local development

Prerequisites: Node 20+ (22 recommended), Docker, and npm.

```bash
npm install
npx supabase start                    # local Postgres, Auth, Storage, Mailpit (emails)
npx supabase status -o env            # shows the local API URL and keys
cp .env.example .env.local            # paste the local URL + anon key (+ service key for scripts/tests)
npm run dev                           # http://localhost:3000  (redirects to /ar)
```

- Confirmation and password-reset emails land in **Mailpit** at http://127.0.0.1:54324.
- `npx supabase db reset` re-applies all migrations from scratch.
- After changing the schema, regenerate the types:
  `npx supabase gen types typescript --local > src/lib/supabase/database.types.ts`

### First administrator

1. Register normally in the app (any role) and confirm the email.
2. Run this from a trusted machine:

   ```bash
   node --env-file=.env.local scripts/make-admin.mjs you@company.com            # or … operations
   ```

3. Further admins and operations managers can then be managed from **Admin → Users**.

### Demo data (optional)

```bash
node --env-file=.env.local scripts/seed-demo.mjs           # 2 suppliers + 1 buyer, products
node --env-file=.env.local scripts/seed-demo.mjs --remove  # delete every demo record
```

Demo records are kept clearly apart from real ones:

- Companies have `is_demo = true`.
- Names start with `[DEMO]` / `[تجريبي]`.
- Users are on `example.com`.
- The admin console shows a Demo badge, and the landing page excludes demo companies.
- The script refuses to run against a non-local project unless `ALLOW_DEMO_SEED=yes`. **Never seed production.**

### Tests

```bash
npm run test:db     # 14 end-to-end workflow + RLS tests (needs local Supabase; after `db reset` wait a few seconds for services to restart)
npm run build && npx next start -p 3000 &
npm run test:ui     # 14-step browser journey (Playwright/Chromium)
npm run lint && npx tsc --noEmit
```

Results and coverage are in [docs/TESTING_REPORT.md](docs/TESTING_REPORT.md).

---

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | app | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | app | Public anon key. Safe in the browser, because RLS protects all data |
| `NEXT_PUBLIC_SITE_URL` | app | Canonical site URL (e.g. `https://ticoshov.com`), used in auth email redirects |
| `SUPABASE_SERVICE_ROLE_KEY` | **scripts/tests only** | Bypasses RLS. **Never** set it in Vercel or any browser-facing environment. The web app does not use it. |

---

## Deployment (Supabase Cloud + Vercel)

### 1. Supabase project

1. Create a project. Choose the region deliberately; data residency is a legal-review item.
2. Apply the schema:

   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push            # applies supabase/migrations (incl. storage buckets & policies)
   ```

3. Configure **Authentication → URL configuration**:
   - Site URL: `https://<your-domain>`
   - Redirect URLs: `https://<your-domain>/auth/confirm` (and preview domains if needed)
4. Under **Authentication → Providers → Email**, keep **Confirm email** enabled.
5. Under **Authentication → SMTP**, configure a real SMTP provider. The built-in sender is
   rate-limited and not intended for production.
6. Email templates: the defaults work, because `/auth/confirm` handles both the PKCE `code` and the
   `token_hash` flows. To brand the emails, keep `{{ .ConfirmationURL }}` as the link.
7. Recommended:
   - Enable leaked-password protection.
   - Set a password minimum of 10+ characters.
   - Review the Auth rate limits.
8. Schedule the overdue/expiry job with **Database → Extensions → pg_cron**:

   ```sql
   select cron.schedule('ticoshov-daily', '15 2 * * *', $$select public.refresh_overdue_commissions()$$);
   ```

   Staff can also run it from the admin overview ("Refresh overdue & expiries").
9. Create the first admin with `scripts/make-admin.mjs`, using the cloud URL and service key in a
   local, untracked env file.
10. In **Admin → Settings**, set `support_email`, `support_phone` and the commission defaults.

### 2. Vercel

1. Import the repository. The framework preset is Next.js and needs no build overrides.
2. Set the three `NEXT_PUBLIC_*` variables for Production (and Preview if used).
3. Deploy, then add the production domain to the Supabase redirect URLs.

`next.config.ts` sets the security headers (HSTS, frame denial, nosniff, referrer and permissions
policies). Server Action bodies are limited to 21 MB, which matches the 20 MB document limit.

---

## Security model (summary)

- **RLS is on every table.** Anonymous visitors only see public catalogue data: approved suppliers,
  published products, reference data, and public settings.
- **Workflow changes go through Postgres functions.** This covers deal status, acceptance, payment
  declarations, verification decisions, commission confirmation and disputes. Each function checks
  the caller's role and the allowed transition.
- **Column guards are `SECURITY INVOKER` triggers.** They stop clients from changing protected
  columns such as role, verification status, or quotation status.
- **Private files** live in a private bucket with path-based policies. They are served through
  `/files`, which creates a short-lived signed URL with the *user's* session. A counterparty can
  read deal documents but cannot delete the other side's files.
- **The service role key is never used by the web app.**

Details are in [docs/DATABASE.md](docs/DATABASE.md).

## Known limitations

These are deliberate scope limits for this MVP, not hidden failures.

- Notifications are **in-app only**. No outbound email or WhatsApp is sent for business events;
  only auth emails go out.
- Messaging refreshes on page load or after sending. Supabase Realtime is not wired in.
- Each company is created with one owner. The schema supports multiple members, but there is no
  team-invitation UI yet.
- There is no currency conversion. Monetary KPIs are reported per currency.
- Search uses the Postgres `simple` dictionary plus trigram matching. There is no Arabic
  stemming/normalisation beyond that.
- Only Egypt and Saudi Arabia are enabled. Other countries are seeded but inactive until an admin
  enables them.
- No payment gateway is integrated (by design). Commission payments are recorded and confirmed manually.
