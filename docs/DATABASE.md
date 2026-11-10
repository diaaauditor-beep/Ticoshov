# Database & security model

The migrations in `supabase/migrations/` are the source of truth. The database has:

- 38 tables in `public`, all with Row Level Security enabled.
- 86 policies across `public` and `storage`.

## Migrations

| File | Contents |
|---|---|
| `…001_foundation` | Enums. Reference tables (currencies, countries with per-country registration fields, units, incoterms). `profiles`, `companies` (public fields), `company_legal` (private), `company_members`, `supplier_verifications`, `verification_internal_notes` (staff only), `verification_documents` |
| `…002_catalog` | Self-nested `categories` (+ `subcategories` view), `company_categories`, `products` (generated `search_vector`, trigram indexes), images, specifications |
| `…003_trading` | `rfqs` (+ attachments), `quotations` (+ items, attachments, revision counter), `deals` (+ status history), `conversations`, `messages`, `message_reports` |
| `…004_operations` | `commission_rules`, `commissions`, `commission_payments`, `shipments`, `shipment_documents`, `trade_document_requirements`, `notifications`, `reviews`, `disputes`, `admin_actions`, `audit_logs`, `platform_settings` |
| `…005_security` | Helper functions, column-guard triggers, the audit trigger, all RLS policies, and actor-column defaults |
| `…006_workflows` | Workflow RPCs (see below), notification helpers, commission resolution, admin analytics, function grants |
| `…007_storage` | `public-assets` and `private-files` buckets (size and MIME allow-lists), `can_access_file()`, storage policies |
| `…008_reference_data` | EG/SA (active) and 8 inactive countries, 5 currencies, units, Incoterms 2020, categories, default settings, and the EG→SA document checklist |
| `…009_admin` | `admin_list_users`, `admin_set_user`, `start_verification_review` |

## Roles

`profiles.role` is one of `admin | operations | supplier | buyer`.

- Sign-up can only produce `supplier` or `buyer`. Any other value in the signup metadata is ignored.
- Only an admin can change a role or deactivate an account. Admins cannot demote or deactivate
  themselves.
- `operations` is staff. It can review verifications, moderate, handle disputes and move deals.
- Only `admin` can confirm commission money, change settings, manage users, or read the audit log.

## How permissions are enforced

1. **RLS policies.** These cover read and insert/update access per row, using `SECURITY DEFINER`
   helpers such as `is_company_member()`, `is_staff()`, `is_deal_party()` and
   `is_conversation_party()`.
2. **Column guards.** These `BEFORE UPDATE` triggers are deliberately `SECURITY INVOKER`.
   - For a direct client write, `current_user` is `authenticated`, so `is_client_request()` is true
     and the guard rejects changes to protected columns. Examples: role, `is_active`,
     verification status, company kind, `is_demo`, quotation status (only → `withdrawn`), and RFQ
     ownership or status.
   - Inside a `SECURITY DEFINER` workflow function, `current_user` is the owner, so the guard
     lets the workflow change those columns.

   > This distinction is load-bearing. The E2E tests caught an earlier version in which the guards
   > were `SECURITY DEFINER` and therefore never fired. **Do not make guard functions
   > `SECURITY DEFINER`.**
3. **No client write path for workflow tables.** `deals`, `deal_status_history`, `commissions`,
   `notifications` inserts, `disputes` status and `conversations` creation have no client
   INSERT/UPDATE policy (or only a narrow one). They change only through RPCs.
4. **Actor columns.** Fields such as `created_by`, `uploaded_by`, `sender_id` and `submitted_by`
   default to `auth.uid()`, and the INSERT policies require that value. This means a row can't be
   attributed to someone else.

## Workflow functions (RPC)

| Function | Who | Effect |
|---|---|---|
| `create_company(...)` | supplier/buyer without a company | Creates the company, legal record and owner membership. Buyers are auto-approved; suppliers get a pending verification |
| `submit_verification(company)` | company manager | Requires at least one document |
| `start_verification_review`, `review_verification` | staff | Decision, message to the company, and internal notes (stored in a separate staff-only table) |
| `start_negotiation(quotation)` | buyer | Creates a `negotiation` deal and conversation |
| `accept_quotation(quotation)` | buyer | Creates or advances the deal to `quotation_accepted`, rejects competing quotes, awards the RFQ, and creates a `pending` commission |
| `update_deal_status(deal, to)` | parties/staff | Applies the transition matrix below |
| `declare_payment(deal)` | each party | Both declarations move the deal to `payment_confirmed`. This is a declaration only and is not verified by TICOSHOV |
| `open_dispute`, `resolve_dispute` | party / staff | Opening freezes the deal; staff resolve it with resume, completed or cancelled |
| `review_commission_payment` | **admin** | Confirms or rejects a reported payment and updates `amount_paid` and status |
| `refresh_overdue_commissions()` | staff or scheduler | Marks commissions overdue and expires stale quotations and RFQs |
| `admin_dashboard_stats(filters)` | staff | KPIs as JSON, with money grouped by currency |

### Deal transitions (non-staff)

```
negotiation ─(accept_quotation)→ quotation_accepted → awaiting_payment_confirmation
  → payment_confirmed (both parties declared) → production* → ready_for_shipment* → shipped*
  → delivered† → completed†
* supplier only   † buyer only
cancelled: either party, only before payment_confirmed
disputed: only via open_dispute / resolve_dispute
```

Staff can apply any transition (it is recorded in the history). Completion makes the commission
`due`, with a due date of today plus `commission_due_days`. Cancellation waives an unpaid commission.

## Storage

| Bucket | Path | Read | Write |
|---|---|---|---|
| `public-assets` | `companies/<company>/…`, `products/<company>/…` | public | company managers/members, staff |
| `private-files` | `verification/<company>/…` | company members, staff | company managers |
| | `rfq/<rfq>/…`, `quotation/<q>/…` | anyone who can view the RFQ / buyer, supplier and staff | owner side |
| | `deal/<deal>/…`, `conversation/<c>/…` | parties, staff | parties |
| | `commission/<id>/…` | payer side, staff | payer side |

Private files can only be deleted by the user who uploaded them. Downloads go through `/files?path=`,
which creates a 60-second signed URL using the requesting user's own session, so RLS decides access.

## Audit

`audit_trigger` writes old and new row data for inserts, updates and deletes on 21 business tables
to `audit_logs`. Privileged RPCs also write a semantic entry to `admin_actions`. Both tables are
readable only by admins and have no client write path.
