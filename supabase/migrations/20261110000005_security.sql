-- =====================================================================
-- TICOSHOV · Migration 5 · Security
-- Authorization helpers, Row Level Security on every table, column guards
-- and audit logging. All authorization is enforced HERE, in the database —
-- the UI's role checks are convenience only.
--
-- Pattern: privileged state changes (approving suppliers, accepting
-- quotations, moving deals, recording commission payments…) happen only in
-- SECURITY DEFINER functions (migration 6) that check the caller themselves.
-- Inside those functions current_user = function owner, so the guard
-- triggers below can distinguish "client wrote this directly" (current_user
-- = authenticated/anon) from "trusted workflow function wrote this".
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------
create or replace function public.auth_role()
returns public.user_role language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.is_active
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.auth_role() = 'admin', false)
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.auth_role() in ('admin', 'operations'), false)
$$;

-- True when the statement runs with a client role (direct PostgREST access).
-- Must only be called from SECURITY INVOKER code: inside SECURITY DEFINER functions
-- current_user is the function owner, so this returns false there by design.
create or replace function public.is_client_request()
returns boolean language sql stable security invoker set search_path = '' as $$
  select current_user in ('authenticated', 'anon')
$$;

create or replace function public.is_company_member(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.company_members m
    join public.profiles p on p.id = m.user_id and p.is_active
    where m.company_id = cid and m.user_id = auth.uid())
$$;

create or replace function public.is_company_manager(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.company_members m
    join public.profiles p on p.id = m.user_id and p.is_active
    where m.company_id = cid and m.user_id = auth.uid() and m.member_role in ('owner', 'manager'))
$$;

create or replace function public.my_company_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select m.company_id from public.company_members m
  join public.profiles p on p.id = m.user_id and p.is_active
  where m.user_id = auth.uid()
$$;

-- Approved supplier companies the caller belongs to
create or replace function public.my_approved_supplier_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select c.id from public.companies c
  where c.id in (select public.my_company_ids())
    and c.kind = 'supplier' and c.verification_status = 'approved' and c.is_active
$$;

create or replace function public.can_view_rfq(rid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.rfqs r
    where r.id = rid and (
      public.is_staff()
      or public.is_company_member(r.buyer_company_id)
      -- suppliers that already quoted keep access
      or exists (select 1 from public.quotations q
                 where q.rfq_id = r.id and q.supplier_company_id in (select public.my_company_ids()))
      -- approved suppliers see open RFQs (public, or targeted at them)
      or (r.status = 'open' and r.expires_at > now() and exists (
            select 1 from public.my_approved_supplier_ids() s(id)
            where r.target_company_id is null or r.target_company_id = s.id))
    ))
$$;

create or replace function public.is_deal_party(did uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.deals d
    where d.id = did
      and (public.is_company_member(d.buyer_company_id) or public.is_company_member(d.supplier_company_id)))
$$;

create or replace function public.is_conversation_party(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversations c
    where c.id = cid
      and (public.is_company_member(c.buyer_company_id) or public.is_company_member(c.supplier_company_id)))
$$;

-- ---------------------------------------------------------------------
-- Column guards (things a client may never change directly)
-- ---------------------------------------------------------------------
create or replace function public.guard_profiles()
-- SECURITY INVOKER on purpose: current_user must stay 'authenticated' for direct client
-- writes (guard applies) and becomes the owner inside SECURITY DEFINER workflow RPCs (guard skipped).
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if public.is_client_request() and not public.is_admin() then
    if new.role is distinct from old.role or new.is_active is distinct from old.is_active then
      raise exception 'Only administrators can change roles or account status' using errcode = '42501';
    end if;
  end if;
  if public.is_client_request() and public.is_admin() and new.id = auth.uid()
     and (new.role <> 'admin' or not new.is_active) then
    raise exception 'Administrators cannot demote or deactivate themselves' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profiles();

create or replace function public.guard_companies()
-- SECURITY INVOKER on purpose: current_user must stay 'authenticated' for direct client
-- writes (guard applies) and becomes the owner inside SECURITY DEFINER workflow RPCs (guard skipped).
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if public.is_client_request() and not public.is_staff() then
    if new.verification_status is distinct from old.verification_status
       or new.verified_at is distinct from old.verified_at
       or new.is_active is distinct from old.is_active
       or new.kind is distinct from old.kind
       or new.is_demo is distinct from old.is_demo
       or new.created_by is distinct from old.created_by then
      raise exception 'This company field can only be changed by TICOSHOV staff' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger companies_guard before update on public.companies
  for each row execute function public.guard_companies();

create or replace function public.guard_quotations()
-- SECURITY INVOKER on purpose: current_user must stay 'authenticated' for direct client
-- writes (guard applies) and becomes the owner inside SECURITY DEFINER workflow RPCs (guard skipped).
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if public.is_client_request() then
    if new.rfq_id <> old.rfq_id or new.supplier_company_id <> old.supplier_company_id then
      raise exception 'Quotation ownership cannot change' using errcode = '42501';
    end if;
    if new.status is distinct from old.status and not (
         new.status = 'withdrawn' and old.status in ('submitted', 'negotiating')) then
      raise exception 'Quotation status can only change through the platform workflow' using errcode = '42501';
    end if;
    if old.status not in ('submitted', 'negotiating') then
      raise exception 'This quotation can no longer be edited' using errcode = '42501';
    end if;
    if new.status = old.status then
      new.revision := old.revision + 1;   -- a supplier revision during negotiation
    end if;
  end if;
  return new;
end $$;
create trigger quotations_guard before update on public.quotations
  for each row execute function public.guard_quotations();

create or replace function public.guard_rfqs()
-- SECURITY INVOKER on purpose: current_user must stay 'authenticated' for direct client
-- writes (guard applies) and becomes the owner inside SECURITY DEFINER workflow RPCs (guard skipped).
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if public.is_client_request() and not public.is_staff() then
    if new.buyer_company_id <> old.buyer_company_id or new.reference <> old.reference then
      raise exception 'RFQ ownership cannot change' using errcode = '42501';
    end if;
    if new.status is distinct from old.status and not (
         old.status = 'open' and new.status in ('closed', 'cancelled')) then
      raise exception 'Invalid RFQ status change' using errcode = '42501';
    end if;
    if old.status <> 'open' and (new.title, new.description, new.quantity) is distinct from (old.title, old.description, old.quantity) then
      raise exception 'Closed RFQs cannot be edited' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger rfqs_guard before update on public.rfqs
  for each row execute function public.guard_rfqs();

-- ---------------------------------------------------------------------
-- Audit logging
-- ---------------------------------------------------------------------
create or replace function public.audit_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  rec_id text;
begin
  rec_id := coalesce(
    (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id',
    (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'company_id',
    (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'key');
  insert into public.audit_logs (actor_id, table_name, record_id, action, old_data, new_data)
  values (auth.uid(), tg_table_name, rec_id, tg_op,
          case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'companies', 'company_legal', 'company_members', 'supplier_verifications',
    'verification_documents', 'categories', 'countries', 'currencies', 'products', 'rfqs',
    'quotations', 'deals', 'commissions', 'commission_payments', 'commission_rules',
    'shipments', 'shipment_documents', 'disputes', 'platform_settings', 'message_reports']
  loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I
       for each row execute function public.audit_trigger()', t || '_audit', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Enable RLS on every table
-- ---------------------------------------------------------------------
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

-- Defense in depth: anonymous visitors never touch private tables at all.
revoke all on
  public.company_legal, public.company_members, public.supplier_verifications,
  public.verification_internal_notes, public.verification_documents, public.rfqs, public.rfq_attachments, public.quotations,
  public.quotation_items, public.quotation_attachments, public.conversations, public.messages,
  public.message_reports, public.deals, public.deal_status_history, public.commission_rules,
  public.commissions, public.commission_payments, public.shipments, public.shipment_documents,
  public.notifications, public.disputes, public.admin_actions, public.audit_logs,
  public.profiles
from anon;

-- Append-only / workflow-only tables: no direct client writes.
revoke insert, update, delete on public.audit_logs, public.admin_actions,
  public.deal_status_history, public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- ---------------------------------------------------------------------
-- Reference data: readable by everyone, writable by admins
-- ---------------------------------------------------------------------
create policy "reference read" on public.currencies for select using (true);
create policy "reference admin write" on public.currencies for all
  using (public.is_admin()) with check (public.is_admin());
create policy "reference read" on public.countries for select using (true);
create policy "reference admin write" on public.countries for all
  using (public.is_admin()) with check (public.is_admin());
create policy "reference read" on public.units for select using (true);
create policy "reference admin write" on public.units for all
  using (public.is_admin()) with check (public.is_admin());
create policy "reference read" on public.incoterms for select using (true);
create policy "reference admin write" on public.incoterms for all
  using (public.is_admin()) with check (public.is_admin());
create policy "reference read" on public.categories for select using (is_active or public.is_staff());
create policy "reference admin write" on public.categories for all
  using (public.is_admin()) with check (public.is_admin());
create policy "reference read" on public.trade_document_requirements for select using (true);
create policy "reference admin write" on public.trade_document_requirements for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------
create policy "profiles read own, colleagues, staff" on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or public.is_staff()
    or exists (select 1 from public.company_members m
               where m.user_id = profiles.id and m.company_id in (select public.my_company_ids())));
create policy "profiles update own" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());
-- inserts happen only through the auth.users trigger (security definer)

-- ---------------------------------------------------------------------
-- Companies (public profile)
-- ---------------------------------------------------------------------
create policy "companies public read" on public.companies for select
  using (
    (is_active and kind = 'supplier' and verification_status = 'approved')
    or ((select auth.uid()) is not null and is_active)   -- signed-in users see business names (buyers in RFQs etc.)
    or public.is_company_member(id)
    or public.is_staff());
create policy "companies managers update" on public.companies for update to authenticated
  using (public.is_company_manager(id) or public.is_staff())
  with check (public.is_company_manager(id) or public.is_staff());
-- inserts only through create_company(); deletes only by admins
create policy "companies admin delete" on public.companies for delete to authenticated
  using (public.is_admin());

create policy "company legal members and staff" on public.company_legal for select to authenticated
  using (public.is_company_member(company_id) or public.is_staff());
create policy "company legal managers write" on public.company_legal for update to authenticated
  using (public.is_company_manager(company_id) or public.is_staff())
  with check (public.is_company_manager(company_id) or public.is_staff());

create policy "members read" on public.company_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_company_member(company_id) or public.is_staff());
create policy "members managed by managers" on public.company_members for delete to authenticated
  using ((public.is_company_manager(company_id) and member_role <> 'owner') or public.is_admin());

create policy "company categories read" on public.company_categories for select using (true);
create policy "company categories managers write" on public.company_categories for all to authenticated
  using (public.is_company_manager(company_id) or public.is_staff())
  with check (public.is_company_manager(company_id) or public.is_staff());

-- ---------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------
create policy "verifications read" on public.supplier_verifications for select to authenticated
  using (public.is_company_member(company_id) or public.is_staff());
-- created/updated through submit_verification() / review_verification()

create policy "verification notes staff" on public.verification_internal_notes for select to authenticated
  using (public.is_staff());
-- written only through review_verification()

create policy "verification docs read" on public.verification_documents for select to authenticated
  using (public.is_company_member(company_id) or public.is_staff());
create policy "verification docs upload" on public.verification_documents for insert to authenticated
  with check (
    public.is_company_manager(company_id)
    and uploaded_by = (select auth.uid())
    and exists (select 1 from public.supplier_verifications v
                where v.id = verification_id and v.company_id = verification_documents.company_id
                  and v.status in ('pending', 'needs_documents')));
create policy "verification docs delete before review" on public.verification_documents for delete to authenticated
  using (
    public.is_company_manager(company_id)
    and exists (select 1 from public.supplier_verifications v
                where v.id = verification_id and v.status in ('pending', 'needs_documents')));

-- ---------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------
create policy "products read" on public.products for select
  using (
    (status = 'published' and exists (
       select 1 from public.companies c
       where c.id = products.company_id and c.is_active and c.verification_status = 'approved'))
    or public.is_company_member(company_id)
    or public.is_staff());
create policy "products supplier insert" on public.products for insert to authenticated
  with check (
    public.is_company_member(company_id)
    and exists (select 1 from public.companies c where c.id = company_id and c.kind = 'supplier')
    -- only verified suppliers can publish
    and (status <> 'published' or company_id in (select public.my_approved_supplier_ids())));
create policy "products supplier update" on public.products for update to authenticated
  using (public.is_company_member(company_id) or public.is_staff())
  with check (
    public.is_staff()
    or (public.is_company_member(company_id)
        and (status <> 'published' or company_id in (select public.my_approved_supplier_ids()))));
create policy "products supplier delete" on public.products for delete to authenticated
  using (public.is_company_member(company_id) or public.is_staff());

create policy "product images read" on public.product_images for select
  using (exists (select 1 from public.products p where p.id = product_id));  -- inherits products RLS
create policy "product images write" on public.product_images for all to authenticated
  using (exists (select 1 from public.products p where p.id = product_id and (public.is_company_member(p.company_id) or public.is_staff())))
  with check (exists (select 1 from public.products p where p.id = product_id and (public.is_company_member(p.company_id) or public.is_staff())));

create policy "product specs read" on public.product_specifications for select
  using (exists (select 1 from public.products p where p.id = product_id));
create policy "product specs write" on public.product_specifications for all to authenticated
  using (exists (select 1 from public.products p where p.id = product_id and (public.is_company_member(p.company_id) or public.is_staff())))
  with check (exists (select 1 from public.products p where p.id = product_id and (public.is_company_member(p.company_id) or public.is_staff())));

-- ---------------------------------------------------------------------
-- RFQs and quotations
-- ---------------------------------------------------------------------
create or replace function public.my_company_quoted(rid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.quotations q
                 where q.rfq_id = rid and q.supplier_company_id in (select public.my_company_ids()))
$$;

-- Evaluated on the row's own columns (not can_view_rfq(id)) so INSERT ... RETURNING works:
-- a freshly inserted row is not yet visible to a function that re-reads the table.
create policy "rfqs read" on public.rfqs for select to authenticated
  using (
    public.is_staff()
    or public.is_company_member(buyer_company_id)
    or public.my_company_quoted(id)
    or (status = 'open' and expires_at > now() and exists (
          select 1 from public.my_approved_supplier_ids() s(sid)
          where target_company_id is null or target_company_id = s.sid)));
create policy "rfqs buyer insert" on public.rfqs for insert to authenticated
  with check (
    public.is_company_member(buyer_company_id)
    and exists (select 1 from public.companies c where c.id = buyer_company_id and c.kind = 'buyer' and c.is_active)
    and created_by = (select auth.uid())
    and status = 'open');
create policy "rfqs buyer update" on public.rfqs for update to authenticated
  using (public.is_company_member(buyer_company_id) or public.is_staff())
  with check (public.is_company_member(buyer_company_id) or public.is_staff());

create policy "rfq attachments read" on public.rfq_attachments for select to authenticated
  using (public.can_view_rfq(rfq_id));
create policy "rfq attachments buyer write" on public.rfq_attachments for insert to authenticated
  with check (exists (select 1 from public.rfqs r where r.id = rfq_id and public.is_company_member(r.buyer_company_id))
              and uploaded_by = (select auth.uid()));
create policy "rfq attachments buyer delete" on public.rfq_attachments for delete to authenticated
  using (exists (select 1 from public.rfqs r where r.id = rfq_id and public.is_company_member(r.buyer_company_id)));

create policy "quotations read" on public.quotations for select to authenticated
  using (
    public.is_company_member(supplier_company_id)
    or exists (select 1 from public.rfqs r where r.id = rfq_id and public.is_company_member(r.buyer_company_id))
    or public.is_staff());
create policy "quotations supplier insert" on public.quotations for insert to authenticated
  with check (
    supplier_company_id in (select public.my_approved_supplier_ids())
    and created_by = (select auth.uid())
    and status = 'submitted'
    and public.can_view_rfq(rfq_id)
    and exists (select 1 from public.rfqs r where r.id = rfq_id and r.status = 'open' and r.expires_at > now()));
create policy "quotations supplier update" on public.quotations for update to authenticated
  using (public.is_company_member(supplier_company_id))
  with check (public.is_company_member(supplier_company_id));

create policy "quotation items read" on public.quotation_items for select to authenticated
  using (exists (select 1 from public.quotations q where q.id = quotation_id));
create policy "quotation items supplier write" on public.quotation_items for all to authenticated
  using (exists (select 1 from public.quotations q where q.id = quotation_id
                 and public.is_company_member(q.supplier_company_id) and q.status in ('submitted', 'negotiating')))
  with check (exists (select 1 from public.quotations q where q.id = quotation_id
                 and public.is_company_member(q.supplier_company_id) and q.status in ('submitted', 'negotiating')));

create policy "quotation attachments read" on public.quotation_attachments for select to authenticated
  using (exists (select 1 from public.quotations q where q.id = quotation_id));
create policy "quotation attachments supplier write" on public.quotation_attachments for insert to authenticated
  with check (uploaded_by = (select auth.uid()) and exists (
    select 1 from public.quotations q where q.id = quotation_id and public.is_company_member(q.supplier_company_id)));

-- ---------------------------------------------------------------------
-- Conversations & messages (platform-controlled communication)
-- ---------------------------------------------------------------------
create policy "conversations read" on public.conversations for select to authenticated
  using (public.is_conversation_party(id) or public.is_staff());
create policy "conversations staff update" on public.conversations for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
-- created through open_conversation()

create policy "messages read" on public.messages for select to authenticated
  using (
    public.is_staff()
    or (public.is_conversation_party(conversation_id) and not is_hidden));
create policy "messages send" on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and is_hidden = false
    and exists (select 1 from public.conversations c where c.id = conversation_id and (
      (not c.is_locked and sender_company_id in (c.buyer_company_id, c.supplier_company_id)
         and public.is_company_member(sender_company_id))
      or (public.is_staff() and sender_company_id is null))));
create policy "messages staff moderate" on public.messages for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "message reports create" on public.message_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'open' and exists (
    select 1 from public.messages m where m.id = message_id and public.is_conversation_party(m.conversation_id)));
create policy "message reports read" on public.message_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_staff());
create policy "message reports staff update" on public.message_reports for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------
-- Deals (writes only through workflow functions)
-- ---------------------------------------------------------------------
create policy "deals read" on public.deals for select to authenticated
  using (public.is_deal_party(id) or public.is_staff());
create policy "deal history read" on public.deal_status_history for select to authenticated
  using (public.is_deal_party(deal_id) or public.is_staff());

-- ---------------------------------------------------------------------
-- Commissions
-- ---------------------------------------------------------------------
create policy "commission rules staff read" on public.commission_rules for select to authenticated
  using (public.is_staff());
create policy "commission rules admin write" on public.commission_rules for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "commissions read" on public.commissions for select to authenticated
  using (public.is_staff() or public.is_company_member(supplier_company_id)
         or (payer in ('buyer', 'both') and public.is_company_member(buyer_company_id)));
create policy "commissions admin update" on public.commissions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "commission payments read" on public.commission_payments for select to authenticated
  using (exists (select 1 from public.commissions c where c.id = commission_id));  -- inherits commissions RLS
create policy "commission payments party submit" on public.commission_payments for insert to authenticated
  with check (
    submitted_by = (select auth.uid()) and status = 'submitted'
    and exists (select 1 from public.commissions c where c.id = commission_id and (
      public.is_company_member(c.supplier_company_id)
      or (c.payer in ('buyer', 'both') and public.is_company_member(c.buyer_company_id)))));
-- confirmation / rejection through review_commission_payment()

-- ---------------------------------------------------------------------
-- Shipments & trade documents
-- ---------------------------------------------------------------------
create policy "shipments read" on public.shipments for select to authenticated
  using (public.is_deal_party(deal_id) or public.is_staff());
create policy "shipments supplier write" on public.shipments for insert to authenticated
  with check (public.is_staff() or exists (
    select 1 from public.deals d where d.id = deal_id and public.is_company_member(d.supplier_company_id)
      and d.status not in ('cancelled', 'completed', 'negotiation')));
create policy "shipments supplier update" on public.shipments for update to authenticated
  using (public.is_staff() or exists (
    select 1 from public.deals d where d.id = deal_id and public.is_company_member(d.supplier_company_id)))
  with check (public.is_staff() or exists (
    select 1 from public.deals d where d.id = deal_id and public.is_company_member(d.supplier_company_id)));

create policy "trade docs read" on public.shipment_documents for select to authenticated
  using (public.is_deal_party(deal_id) or public.is_staff());
create policy "trade docs upload" on public.shipment_documents for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and public.is_company_member(company_id)
    and exists (select 1 from public.deals d where d.id = deal_id
                and company_id in (d.buyer_company_id, d.supplier_company_id)));
create policy "trade docs delete own" on public.shipment_documents for delete to authenticated
  using (uploaded_by = (select auth.uid()) or public.is_staff());

-- ---------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------
create policy "notifications own" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notifications mark read" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------
create policy "reviews public read" on public.reviews for select using (not is_hidden or public.is_staff());
create policy "reviews by deal party after completion" on public.reviews for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and public.is_company_member(reviewer_company_id)
    and exists (select 1 from public.deals d where d.id = deal_id and d.status = 'completed'
      and ((d.buyer_company_id = reviewer_company_id and d.supplier_company_id = reviewee_company_id)
        or (d.supplier_company_id = reviewer_company_id and d.buyer_company_id = reviewee_company_id))));
create policy "reviews staff moderate" on public.reviews for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------
-- Disputes
-- ---------------------------------------------------------------------
create policy "disputes read" on public.disputes for select to authenticated
  using (public.is_deal_party(deal_id) or public.is_staff());
create policy "disputes staff update" on public.disputes for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
-- opened through open_dispute()

-- ---------------------------------------------------------------------
-- Administration
-- ---------------------------------------------------------------------
create policy "admin actions staff read" on public.admin_actions for select to authenticated
  using (public.is_staff());
create policy "audit logs admin read" on public.audit_logs for select to authenticated
  using (public.is_admin());
create policy "settings read" on public.platform_settings for select
  using (is_public or public.is_staff());
create policy "settings admin write" on public.platform_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Actor columns default to the caller. INSERT policies still require
-- them to equal auth.uid(), so a client can never attribute a row to someone else.
-- ---------------------------------------------------------------------
alter table public.verification_documents alter column uploaded_by set default auth.uid();
alter table public.rfqs                   alter column created_by  set default auth.uid();
alter table public.rfq_attachments        alter column uploaded_by set default auth.uid();
alter table public.quotations             alter column created_by  set default auth.uid();
alter table public.quotation_attachments  alter column uploaded_by set default auth.uid();
alter table public.messages               alter column sender_id   set default auth.uid();
alter table public.message_reports        alter column reporter_id set default auth.uid();
alter table public.commission_payments    alter column submitted_by set default auth.uid();
alter table public.shipment_documents     alter column uploaded_by set default auth.uid();
alter table public.reviews                alter column created_by  set default auth.uid();
alter table public.products               alter column created_by  set default auth.uid();
alter table public.shipments              alter column created_by  set default auth.uid();
