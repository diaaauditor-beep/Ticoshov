# Testing report

Date: 2026-11-10. Environment:

- Local Supabase stack (Postgres 17, GoTrue, PostgREST, Storage, Mailpit) in Docker.
- A Next.js 16 production build (`next build` + `next start`).
- Chromium through Playwright 1.63.

Nothing here was run against a cloud Supabase project or Vercel.

## Summary

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ no errors |
| `npm run lint` | ✅ no errors, no warnings |
| `npm run build` | ✅ all routes compile |
| `npx supabase db reset` (all 10 migrations from scratch) | ✅ |
| `npm run test:db`: 16 database/RLS workflow tests | ✅ 16 / 16 |
| `npm run test:ui`: 18-step browser journey | ✅ 18 / 18 |
| `scripts/make-admin.mjs` | ✅ (exercised by the UI test) |
| `scripts/seed-demo.mjs` (create, re-run, `--remove`) | ✅ |

## What the database tests prove (`tests/e2e-rls.test.mjs`)

Every business action uses the end user's own session, so RLS applies. The service key is used only
to create test users and to check the resulting state.

1. **Role escalation is blocked.**
   - `role: admin` in the signup metadata produces a buyer.
   - A buyer cannot update their own role.
   - Operations staff cannot call `admin_set_user`.
2. **Onboarding.**
   - There is one company per user, and staff cannot create companies.
   - Direct inserts into `companies` are denied.
   - Suppliers start as pending and buyers are auto-approved.
3. **Private company data.**
   - Another company and anonymous visitors cannot read `company_legal`; staff can.
   - A supplier cannot self-approve.
   - Unverified suppliers are not public.
4. **Verification.**
   - Submitting requires a document.
   - Outsiders and anonymous visitors cannot upload or download verification files; staff can.
   - Staff can review and approve, after which the company becomes public.
   - **Internal notes are not readable by the company.**
5. **Products.**
   - Only the owning supplier can create or edit products, and buyers cannot list them.
   - Drafts are hidden from the public.
   - Full-text search finds published products.
6. **RFQ → quotation → negotiation → acceptance.**
   - References are generated (`RFQ-YYYY-NNNNNN`, `TCS-YYYY-NNNNNN`).
   - Suppliers in the matching category are notified.
   - Quotation totals are computed on the server.
   - Suppliers cannot quote for another company.
   - **Competitors cannot see each other's quotes**, and other buyers cannot see the RFQ.
   - A supplier cannot accept their own quote.
   - A revision during negotiation increments `revision` and updates the deal value.
   - Acceptance rejects competing quotes, awards the RFQ, and creates a 5% pending commission
     (7,250 → 362.50).
7. **Messaging.**
   - Only the parties can read or write; outsiders and competitors are denied.
   - The sender company is set on the server.
   - Reports work, and staff can hide a message, which removes it from the parties' view.
   - Messages cannot be edited, and locked conversations reject new messages.
8. **Deal lifecycle.**
   - Non-parties cannot move a deal, stages cannot be skipped, and direct status writes have no effect.
   - Payment is confirmed only after **both** declarations.
   - A deal cannot be cancelled after payment is confirmed.
   - Production, ready-for-shipment and shipped are supplier-only. Delivered and completed are
     buyer-only.
   - Shipments and trade documents are visible to the counterparty and hidden from outsiders. The
     counterparty **cannot delete** the other side's documents.
   - Status history is recorded, and completion makes the commission `due` with a due date.
9. **Commission payments.**
   - Commissions are hidden from outsiders and from the buyer (the supplier is the payer).
   - A supplier cannot mark a commission paid or self-confirm a payment.
   - **Operations staff cannot confirm money; only an admin can.**
   - The status goes partial → paid as payments are confirmed.
10. **Reviews.** One review per party per deal; outsiders are denied.
11. **Disputes.**
    - Outsiders cannot open a dispute.
    - A disputed deal is frozen, and a party cannot resolve its own dispute.
    - Staff resolve disputes. Resolving as "cancelled" cancels the deal and **waives** the commission.
12. **Notifications.** Each user sees only their own. They cannot be forged or modified by other users.
13. **Anonymous access.**
    - 15 private tables return nothing to anonymous visitors.
    - Only public settings are exposed, and admin stats are denied.
14. **Admin-only areas.**
    - Stats are staff-only; the audit log is written and readable only by admins.
    - Operations staff cannot change settings, and an admin cannot demote themselves.

15. **Tampering.**
    - Parties cannot change a deal's value or a commission's rate, amount or status by writing to the tables directly.
    - Suppliers and operations staff cannot create commission rules, and nobody can forge deal history.
    - Accepted quotations and their line items are frozen.
    - A reported commission payment of any size counts for nothing until an admin confirms it.
    - One party declaring payment twice does not confirm it, and production cannot start before both parties have declared.
    - **A buyer cannot accept a quotation the supplier revised after the buyer last saw it** (see defect 7).

16. **Service providers (customs brokers).**
    - A provider must use a service business type, starts unverified and hidden, cannot self-approve, and appears in the public directory after staff approval.
    - Providers cannot post RFQs or products.
    - Outsiders, the provider itself and unverified providers cannot be added to a deal; direct inserts are denied.
    - Once added, the provider gets a summary **without the deal value**, and no access to the deals table, quotation, commission, history or conversation. It cannot move the deal, declare payment or open a dispute.
    - It sees and downloads shipping documents only; contracts and payment evidence are refused in both the table and Storage. It cannot upload payment evidence or upload in a party's name.
    - Shipment status changes only through the provider function; direct edits are ignored. Other providers are refused.
    - Removal, and deactivation of the provider company, end all access immediately.

## What the browser test proves (`tests/ui-flow.mjs`)

1. A supplier signs up (EN UI) and the confirmation email arrives in Mailpit.
2. An unconfirmed account cannot sign in.
3. The email link confirms the account and lands on onboarding.
4. The supplier completes onboarding.
5. The supplier uploads a verification PDF and submits it for review.
6. `make-admin.mjs` promotes an admin, who signs in and sees the admin overview.
7. The admin approves the verification through the review form.
8. The verified supplier publishes a product with an image.
9. An anonymous visitor finds the product through search.
10. A buyer signs in with the **Arabic** UI, onboards, and creates an RFQ.
11. The supplier submits a quotation (total 7,250).
12. The buyer accepts it from the comparison table, a deal is created, and its `TCS-…` reference is shown.
13. The commission (362.50) appears on the supplier's commissions page.
14. A customs broker signs up with the **Arabic** UI, sees only service business types (no product categories), onboards and submits a licence for verification.
15. The admin approves it, and it appears in the public directory filtered by a country it serves.
16. The buyer adds the broker to the deal with instructions.
17. The broker opens the deal from "Assigned deals": the page shows the instructions and does **not** contain the deal value, unit price or commission. The broker uploads a customs declaration, and the buyer sees it.
18. No horizontal overflow in real mobile emulation at 320 px and 390 px, for the AR and EN landing, products, register and service-provider directory pages.

Screenshots are written to `tests/screenshots/` (gitignored). They were reviewed manually for the
AR deal page, the EN admin overview, search, the verification page and mobile.

## Defects found by these tests and fixed

| # | Severity | Defect | Fix |
|---|---|---|---|
| 1 | **Critical** | The column-guard triggers were `SECURITY DEFINER`, so `is_client_request()` was always false. Any user could set their own `role = 'admin'`, self-approve verification, or set a quotation to accepted through the REST API. | Guards are now `SECURITY INVOKER`, with a regression test. |
| 2 | High | A supplier could read the staff's internal verification notes. | Moved to a `verification_internal_notes` table that only staff can read. |
| 3 | High | RFQ creation failed: the SELECT policy re-read the table, so `INSERT … RETURNING` was rejected. | The policy now evaluates the row's own columns, plus a `my_company_quoted()` helper to avoid policy recursion. |
| 4 | Low | `refresh_overdue_commissions()` could be called by any signed-in user (it was harmless, but unintended). | Restricted to staff or a scheduler with no user session. |
| 5 | Low | 7 lint errors: a `ref` prop name and `Date.now()` during render. | Prop renamed to `reference`; date helpers moved to `lib/format`. |
| 7 | High | During negotiation, a supplier could revise the price just before the buyer clicked accept, so the buyer could accept terms they had not seen. | Acceptance now carries the revision the buyer saw. If it changed, acceptance is refused and the page shows the new terms. Covered by test 15. |
| 6 | Medium | On phones narrower than about 400 px, the header and long supplier names overflowed the screen, and the browser zoomed the whole page out. | The header is compact on small screens (sign-up moves into the menu), cards can shrink, and the browser test now checks 320 and 390 px. |

## Not tested (honest gaps)

- A deployment to Supabase Cloud or Vercel, and real SMTP delivery. Only Mailpit was used locally.
- Browsers other than Chromium (Safari/WebKit and Firefox), and assistive technology (screen readers).
- Load or performance testing, and concurrency races (for example, two buyers accepting at once;
  row locks are used, but this was not stress-tested).
- Every admin page action through the UI. The underlying RPCs and policies are covered by
  `test:db`, but only verification approval was clicked through in the browser.
- Large files near the 20 MB limit, and password-reset email delivery end to end. The route is
  shared with signup confirmation, which was tested.
- Content of the legal pages. They are templates pending legal review (see `LEGAL_REVIEW.md`).
