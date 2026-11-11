# Operations runbook

Day-to-day running of TICOSHOV in production. Setup and deployment are in the [README](../README.md).

## Environments

| Environment | Web | Database | Purpose |
|---|---|---|---|
| Local | `npm run dev` | `npx supabase start` (Docker) | Development and the automated tests |
| Staging | Vercel preview/staging project | **Separate** Supabase project | Pre-launch and pre-release testing. Demo data is allowed here |
| Production | Vercel production | Supabase project (Pro plan) | Real users only. **Never** seed demo data |

Use one Supabase project per environment. Never point staging at the production database.

## Releasing a change

1. Open a PR. CI must be green (type check, lint, build, and the database/RLS tests against a fresh local Supabase).
2. Merge to `main`.
3. Apply the database migrations **before** the new web build goes live:

   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push --dry-run   # review the SQL to be applied
   npx supabase db push
   ```

4. Vercel deploys `main` automatically.
5. Smoke test:
   - landing page
   - sign in
   - open a deal
   - the admin overview

Migrations are append-only. Never edit a migration that has already been applied to staging or production; add a new one instead.

## Backups & restore

- **Supabase Pro** takes daily backups and keeps them for 7 days. Point-in-time recovery (PITR) is a
  paid add-on. Enable it once real deals are flowing, because it lets you restore to any second.
- The Free plan has **no** usable backups and pauses inactive projects. Do not run production on it.
- Supabase backups do **not** include Storage files (logos, product images, verification and trade
  documents). Choose one of these options:
  - a scheduled copy of the `private-files` and `public-assets` buckets to separate storage (for
    example S3 or R2), using the S3-compatible endpoint, or
  - accept the risk and document it.
- Keep a logical dump off-site as well, for example weekly:

  ```bash
  supabase db dump --linked -f backup-$(date +%F).sql                 # schema
  supabase db dump --linked --data-only -f data-$(date +%F).sql       # data
  ```

  These files contain personal and business data. Store them encrypted, with restricted access.
- **Test a restore** into a scratch project at least once before launch, then quarterly.

## Scheduled job

`refresh_overdue_commissions()` marks overdue commissions and expires old quotations and RFQs.
Schedule it daily with pg_cron (see the README), or run it from **Admin → Overview → Refresh**.

## Monitoring

- Supabase dashboard:
  - Database → Reports (CPU, connections, slow queries)
  - Auth → Logs
  - Storage usage
- Vercel dashboard: Functions → errors and duration. Enable alerts for failed deployments.
- Recommended before launch:
  - uptime monitoring on `/ar` (for example Better Stack or UptimeRobot)
  - error tracking for the Next.js server (for example Sentry)

  Neither is integrated yet.

## Managing people & data (Admin console)

The `/ar/admin` or `/en/admin` route is only reachable by staff. From there an administrator can:

- **Users:** change a role (admin, operations, supplier, buyer) and deactivate or reactivate an
  account. A deactivated user cannot sign in, and the database stops granting them company or staff access.
- **Companies:** view the private legal data and deactivate a company, which hides it and its products.
- **Verifications:** review documents and approve, reject, or ask for more documents.
- **Categories, countries, currencies:** add or edit them, and enable new countries for suppliers or buyers.
- **Commissions:**
  - set the default rate and rules per supplier, buyer, category, or country
  - adjust a single commission
  - confirm or reject reported payments, and record a payment received
- **Disputes and moderation:** resolve disputes, and hide messages or lock conversations.
- **Settings:** support contacts, commission defaults, `legal_review_status`.
- **Audit log:** who changed what, and when.

The Supabase dashboard (Table editor / SQL editor) gives the project owner direct database access.
It **bypasses all permission rules**, so:

- use it only for emergencies
- keep the account protected with two-factor authentication
- limit organisation members

## Security hygiene

- Enable 2FA on the GitHub, Vercel and Supabase accounts.
- `SUPABASE_SERVICE_ROLE_KEY` must never be stored in Vercel or committed. Rotate it from Supabase
  (Settings → API) if it is ever exposed.
- Keep at least two admin accounts held by different people, so that losing one does not lock the
  business out.
- After launch, review the admin user list and `admin_actions` monthly.

## Removing demo data

On staging: `node --env-file=.env.staging scripts/seed-demo.mjs --remove`.
Production should never contain demo data. To confirm, this should return 0:

```sql
select count(*) from companies where is_demo;
```
