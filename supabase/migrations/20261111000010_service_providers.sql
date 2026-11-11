-- =====================================================================
-- TICOSHOV · Migration 10 · Service providers (customs brokers, clearing
-- agents, freight forwarders, inspection agencies)
--
-- A service provider is a third kind of company. It registers itself, is
-- verified by TICOSHOV staff exactly like a supplier, and then appears in a
-- public directory. It has NO access to any deal until one of the deal's
-- parties (buyer or supplier) adds it to that specific deal. From then on it
-- can see only what clearing work needs:
--   * a limited deal summary (reference, title, status, parties, route) —
--     never the deal value, quotation, payment declarations or commission
--   * the deal's shipments, and may update the shipment status
--   * shipping / customs documents (not contracts, payment evidence or "other")
--   * documents it uploads itself
-- A party can remove the provider at any time; access stops immediately.
-- Access also stops if the provider loses its verification or is deactivated.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Deal ↔ provider assignments
-- ---------------------------------------------------------------------
create table public.deal_service_providers (
  id                   uuid primary key default gen_random_uuid(),
  deal_id              uuid not null references public.deals(id) on delete cascade,
  provider_company_id  uuid not null references public.companies(id) on delete cascade,
  service              text not null check (service in ('customs_clearance', 'freight_forwarding', 'inspection', 'other')),
  note                 text check (note is null or char_length(note) <= 1000),
  status               text not null default 'active' check (status in ('active', 'removed')),
  added_by_company_id  uuid not null references public.companies(id) on delete cascade,
  added_by             uuid references auth.users(id) on delete set null,
  removed_by           uuid references auth.users(id) on delete set null,
  removed_at           timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (deal_id, provider_company_id)
);
create index deal_service_providers_provider_idx on public.deal_service_providers(provider_company_id) where status = 'active';
create trigger deal_service_providers_updated_at before update on public.deal_service_providers
  for each row execute function public.set_updated_at();
create trigger deal_service_providers_audit after insert or update or delete on public.deal_service_providers
  for each row execute function public.audit_trigger();
alter table public.deal_service_providers enable row level security;
revoke all on public.deal_service_providers from anon;
-- writes only through add_/remove_deal_service_provider()
revoke insert, update, delete on public.deal_service_providers from authenticated;

-- Document types a provider may see / upload. Contracts, payment evidence and
-- "other" stay between the two parties.
create or replace function public.provider_visible_doc(p public.trade_doc_type)
returns boolean language sql immutable set search_path = '' as $$
  select p in ('commercial_invoice', 'packing_list', 'certificate_of_origin', 'bill_of_lading',
               'shipping_document', 'customs_document')
$$;

-- True when the caller belongs to an active, approved provider assigned to the deal.
create or replace function public.is_deal_provider(did uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.deal_service_providers a
    join public.companies c on c.id = a.provider_company_id
    where a.deal_id = did and a.status = 'active'
      and c.kind = 'service_provider' and c.verification_status = 'approved' and c.is_active
      and public.is_company_member(c.id))
$$;

create or replace function public.my_provider_company_for_deal(did uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select a.provider_company_id from public.deal_service_providers a
  join public.companies c on c.id = a.provider_company_id
  where a.deal_id = did and a.status = 'active'
    and c.kind = 'service_provider' and c.verification_status = 'approved' and c.is_active
    and public.is_company_member(c.id)
  limit 1
$$;

create policy "deal providers read" on public.deal_service_providers for select to authenticated
  using (public.is_deal_party(deal_id) or public.is_company_member(provider_company_id) or public.is_staff());

-- ---------------------------------------------------------------------
-- Public directory: approved providers are public like approved suppliers
-- ---------------------------------------------------------------------
drop policy "companies public read" on public.companies;
create policy "companies public read" on public.companies for select
  using (
    (is_active and kind in ('supplier', 'service_provider') and verification_status = 'approved')
    or ((select auth.uid()) is not null and is_active)
    or public.is_company_member(id)
    or public.is_staff());

-- ---------------------------------------------------------------------
-- Shipments & trade documents: add the provider path
-- ---------------------------------------------------------------------
drop policy "shipments read" on public.shipments;
create policy "shipments read" on public.shipments for select to authenticated
  using (public.is_deal_party(deal_id) or public.is_deal_provider(deal_id) or public.is_staff());

drop policy "trade docs read" on public.shipment_documents;
create policy "trade docs read" on public.shipment_documents for select to authenticated
  using (
    public.is_deal_party(deal_id) or public.is_staff()
    or (public.is_deal_provider(deal_id)
        and (public.provider_visible_doc(doc_type) or public.is_company_member(company_id))));

drop policy "trade docs upload" on public.shipment_documents;
create policy "trade docs upload" on public.shipment_documents for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and public.is_company_member(company_id)
    and (
      exists (select 1 from public.deals d where d.id = deal_id
              and company_id in (d.buyer_company_id, d.supplier_company_id))
      or (company_id = public.my_provider_company_for_deal(deal_id)
          and doc_type in ('customs_document', 'shipping_document', 'bill_of_lading', 'certificate_of_origin'))));

-- Storage: providers may upload into the deal folder, and may read only the
-- files behind document rows they are allowed to see.
create or replace function public.can_access_file(p_bucket text, p_name text, p_write boolean)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  v_parts text[] := string_to_array(p_name, '/');
  v_kind text := v_parts[1];
  v_id uuid := public.try_uuid(v_parts[2]);
begin
  if auth.uid() is null or v_id is null or array_length(v_parts, 1) < 3 then
    return false;
  end if;
  if p_bucket = 'public-assets' then
    if v_kind = 'companies' then return public.is_company_manager(v_id) or public.is_staff(); end if;
    if v_kind = 'products' then return public.is_company_member(v_id) or public.is_staff(); end if;
    return false;
  end if;
  if p_bucket <> 'private-files' then return false; end if;

  case v_kind
    when 'verification' then
      return (case when p_write then public.is_company_manager(v_id) else public.is_company_member(v_id) end)
             or public.is_staff();
    when 'rfq' then
      if p_write then
        return exists (select 1 from public.rfqs r where r.id = v_id and public.is_company_member(r.buyer_company_id));
      end if;
      return public.can_view_rfq(v_id);
    when 'quotation' then
      return exists (select 1 from public.quotations q join public.rfqs r on r.id = q.rfq_id
                     where q.id = v_id and (
                       public.is_company_member(q.supplier_company_id)
                       or (not p_write and (public.is_company_member(r.buyer_company_id) or public.is_staff()))));
    when 'conversation' then
      return public.is_conversation_party(v_id) or public.is_staff();
    when 'deal' then
      if public.is_deal_party(v_id) or public.is_staff() then return true; end if;
      if not public.is_deal_provider(v_id) then return false; end if;
      if p_write then return true; end if;
      return exists (select 1 from public.shipment_documents sd
                     where sd.deal_id = v_id and sd.storage_path = p_name
                       and (public.provider_visible_doc(sd.doc_type) or public.is_company_member(sd.company_id)));
    when 'commission' then
      return exists (select 1 from public.commissions c where c.id = v_id and (
               public.is_company_member(c.supplier_company_id)
               or (c.payer in ('buyer', 'both') and public.is_company_member(c.buyer_company_id))
               or public.is_staff()));
    else
      return false;
  end case;
end $$;

-- ---------------------------------------------------------------------
-- Registration: service_provider is self-selectable; admin/operations never are
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_role public.user_role := 'buyer';
  v_locale text := coalesce(new.raw_user_meta_data ->> 'locale', 'ar');
begin
  if (new.raw_user_meta_data ->> 'role') = 'supplier' then
    v_role := 'supplier';
  elsif (new.raw_user_meta_data ->> 'role') = 'service_provider' then
    v_role := 'service_provider';
  end if;
  if v_locale not in ('ar', 'en') then v_locale := 'ar'; end if;
  insert into public.profiles (id, role, full_name, preferred_locale)
  values (new.id, v_role, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120), v_locale);
  return new;
end $$;

create or replace function public.create_company(
  p_name text, p_name_ar text, p_country char(2), p_city text, p_business_type text,
  p_description text, p_description_ar text, p_website text, p_year_established smallint,
  p_cr_number text, p_tax_number text, p_contact_name text, p_contact_email text,
  p_contact_phone text, p_address text, p_category_ids uuid[], p_export_markets char(2)[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_auth();
  v_role public.user_role;
  v_kind public.company_kind;
  v_id uuid;
  v_slug text;
  v_country record;
  v_provider_types text[] := array['customs_broker', 'freight_forwarder', 'logistics_provider', 'inspection_agency'];
begin
  select role into v_role from public.profiles where id = v_uid and is_active;
  if v_role is null or v_role not in ('supplier', 'buyer', 'service_provider') then
    raise exception 'Only supplier, buyer or service provider accounts can register a company' using errcode = '42501';
  end if;
  if exists (select 1 from public.company_members where user_id = v_uid) then
    raise exception 'You already belong to a company' using errcode = '23505';
  end if;
  v_kind := v_role::text::public.company_kind;

  if (v_kind = 'service_provider') <> (p_business_type = any(v_provider_types)) then
    raise exception 'Business type does not match the account type' using errcode = '22023';
  end if;

  select * into v_country from public.countries where code = p_country and is_active;
  if not found then raise exception 'Country is not available' using errcode = '22023'; end if;
  if v_kind = 'supplier' and not v_country.supplier_enabled then
    raise exception 'Supplier registration is not yet open in this country' using errcode = '22023';
  end if;
  if v_kind = 'buyer' and not v_country.buyer_enabled then
    raise exception 'Buyer registration is not yet open in this country' using errcode = '22023';
  end if;

  v_slug := trim(both '-' from regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]+', '-', 'g'));
  if char_length(v_slug) < 3 then v_slug := 'company'; end if;
  v_slug := left(v_slug, 60) || '-' || substr(md5(gen_random_uuid()::text), 1, 6);

  insert into public.companies (kind, name, name_ar, slug, country_code, city, business_type,
    description, description_ar, website, year_established, export_markets, created_by)
  values (v_kind, trim(p_name), nullif(trim(p_name_ar), ''), v_slug, p_country, trim(p_city), p_business_type,
    nullif(trim(p_description), ''), nullif(trim(p_description_ar), ''), nullif(trim(p_website), ''),
    p_year_established, coalesce(p_export_markets, '{}'), v_uid)
  returning id into v_id;

  insert into public.company_legal (company_id, commercial_registration_no, tax_number, contact_name,
    contact_email, contact_phone, address_line)
  values (v_id, nullif(trim(p_cr_number), ''), nullif(trim(p_tax_number), ''), nullif(trim(p_contact_name), ''),
    nullif(trim(p_contact_email), ''), nullif(trim(p_contact_phone), ''), nullif(trim(p_address), ''));

  insert into public.company_members (company_id, user_id, member_role) values (v_id, v_uid, 'owner');

  if p_category_ids is not null and v_kind <> 'service_provider' then
    insert into public.company_categories (company_id, category_id)
    select v_id, c.id from public.categories c where c.id = any(p_category_ids)
    on conflict do nothing;
  end if;

  if v_kind in ('supplier', 'service_provider') then
    -- Suppliers and service providers are reviewed by staff before they become public.
    insert into public.supplier_verifications (company_id, status) values (v_id, 'pending');
  else
    -- Buyers do not need document verification to send RFQs; staff can still review them.
    update public.companies set verification_status = 'approved', verified_at = null where id = v_id;
  end if;
  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- Workflow: a deal party adds / removes a provider
-- ---------------------------------------------------------------------
create or replace function public.add_deal_service_provider(p_deal uuid, p_provider uuid, p_service text, p_note text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_auth();
  v_deal record;
  v_my uuid;
  v_id uuid;
begin
  select * into v_deal from public.deals where id = p_deal for update;
  if not found then raise exception 'Deal not found' using errcode = 'P0002'; end if;
  if public.is_company_member(v_deal.buyer_company_id) then v_my := v_deal.buyer_company_id;
  elsif public.is_company_member(v_deal.supplier_company_id) then v_my := v_deal.supplier_company_id;
  else raise exception 'Only the buyer or supplier of this deal can add a service provider' using errcode = '42501';
  end if;
  if v_deal.status in ('negotiation', 'cancelled', 'completed') then
    raise exception 'Service providers can be added after acceptance and before the deal is closed' using errcode = '22023';
  end if;
  if p_service not in ('customs_clearance', 'freight_forwarding', 'inspection', 'other') then
    raise exception 'Invalid service' using errcode = '22023';
  end if;
  if not exists (select 1 from public.companies c where c.id = p_provider and c.kind = 'service_provider'
                   and c.verification_status = 'approved' and c.is_active) then
    raise exception 'Only verified service providers can be added' using errcode = '22023';
  end if;

  insert into public.deal_service_providers (deal_id, provider_company_id, service, note, added_by_company_id, added_by)
  values (p_deal, p_provider, p_service, nullif(trim(p_note), ''), v_my, v_uid)
  on conflict (deal_id, provider_company_id) do update
    set status = 'active', service = excluded.service, note = excluded.note,
        added_by_company_id = excluded.added_by_company_id, added_by = excluded.added_by,
        removed_at = null, removed_by = null
  returning id into v_id;

  perform public.notify_company(p_provider, 'provider_assigned',
    jsonb_build_object('reference', v_deal.reference), '/dashboard/deals/' || p_deal);
  perform public.notify_company(case when v_my = v_deal.buyer_company_id then v_deal.supplier_company_id else v_deal.buyer_company_id end,
    'provider_added', jsonb_build_object('reference', v_deal.reference), '/dashboard/deals/' || p_deal);
  return v_id;
end $$;

-- Either deal party, the provider itself (withdrawing) or staff can end an assignment.
create or replace function public.remove_deal_service_provider(p_assignment uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_auth();
  v_a record;
  v_ref text;
begin
  select * into v_a from public.deal_service_providers where id = p_assignment for update;
  if not found then raise exception 'Not found' using errcode = 'P0002'; end if;
  if not (public.is_deal_party(v_a.deal_id) or public.is_company_member(v_a.provider_company_id) or public.is_staff()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if v_a.status = 'removed' then return; end if;
  update public.deal_service_providers set status = 'removed', removed_at = now(), removed_by = v_uid where id = p_assignment;
  select reference into v_ref from public.deals where id = v_a.deal_id;
  perform public.notify_company(v_a.provider_company_id, 'provider_removed',
    jsonb_build_object('reference', v_ref), null, v_uid);
  if public.is_staff() and not public.is_deal_party(v_a.deal_id) then
    perform public.log_admin_action('deal_provider.remove', 'deal_service_providers', p_assignment, '{}'::jsonb);
  end if;
end $$;

-- The provider reports clearing progress on the shipment (status only).
create or replace function public.provider_update_shipment(p_shipment uuid, p_status public.shipment_status)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_s record;
  v_ref text;
  v_d record;
begin
  perform public.require_auth();
  select * into v_s from public.shipments where id = p_shipment for update;
  if not found then raise exception 'Shipment not found' using errcode = 'P0002'; end if;
  if not public.is_deal_provider(v_s.deal_id) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_status not in ('in_transit', 'at_customs', 'delivered', 'exception') then
    raise exception 'Invalid shipment status' using errcode = '22023';
  end if;
  select * into v_d from public.deals where id = v_s.deal_id;
  if v_d.status in ('cancelled', 'completed') then
    raise exception 'The deal is closed' using errcode = '22023';
  end if;
  update public.shipments set status = p_status where id = p_shipment;
  perform public.notify_company(v_d.buyer_company_id, 'provider_shipment_update',
    jsonb_build_object('reference', v_d.reference, 'shipment_status', p_status), '/dashboard/deals/' || v_d.id);
  perform public.notify_company(v_d.supplier_company_id, 'provider_shipment_update',
    jsonb_build_object('reference', v_d.reference, 'shipment_status', p_status), '/dashboard/deals/' || v_d.id);
end $$;

-- ---------------------------------------------------------------------
-- What a provider may know about the deals it is assigned to. Providers get no
-- SELECT on deals; these functions return a deliberately limited summary.
-- ---------------------------------------------------------------------
create or replace function public.my_provider_deals()
returns table (assignment_id uuid, deal_id uuid, reference text, title text, status public.deal_status,
               incoterm text, service text, buyer_name text, buyer_name_ar text, buyer_country char(2),
               supplier_name text, supplier_name_ar text, supplier_country char(2), delivery_country char(2),
               assigned_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.id, d.id, d.reference, d.title, d.status, d.incoterm, a.service,
         b.name, b.name_ar, b.country_code, s.name, s.name_ar, s.country_code,
         coalesce(r.delivery_country, b.country_code), a.created_at, d.updated_at
  from public.deal_service_providers a
  join public.companies pc on pc.id = a.provider_company_id
  join public.deals d on d.id = a.deal_id
  join public.companies b on b.id = d.buyer_company_id
  join public.companies s on s.id = d.supplier_company_id
  left join public.rfqs r on r.id = d.rfq_id
  where a.status = 'active' and pc.kind = 'service_provider' and pc.verification_status = 'approved' and pc.is_active
    and public.is_company_member(pc.id)
  order by d.updated_at desc
$$;

create or replace function public.provider_deal_summary(p_deal uuid)
returns table (assignment_id uuid, deal_id uuid, reference text, title text, status public.deal_status,
               incoterm text, service text, note text, buyer_name text, buyer_name_ar text, buyer_slug text,
               buyer_country char(2), supplier_name text, supplier_name_ar text, supplier_slug text,
               supplier_country char(2), delivery_country char(2), unit_code text, quantity numeric,
               provider_company_id uuid, assigned_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.id, d.id, d.reference, d.title, d.status, d.incoterm, a.service, a.note,
         b.name, b.name_ar, b.slug, b.country_code, s.name, s.name_ar, s.slug, s.country_code,
         coalesce(r.delivery_country, b.country_code), r.unit_code, q.quantity,
         a.provider_company_id, a.created_at
  from public.deal_service_providers a
  join public.deals d on d.id = a.deal_id
  join public.companies b on b.id = d.buyer_company_id
  join public.companies s on s.id = d.supplier_company_id
  left join public.rfqs r on r.id = d.rfq_id
  left join public.quotations q on q.id = d.quotation_id
  where a.deal_id = p_deal and a.status = 'active' and public.is_deal_provider(p_deal)
    and public.is_company_member(a.provider_company_id)
$$;

-- ---------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------
revoke execute on function
  public.provider_visible_doc(public.trade_doc_type), public.is_deal_provider(uuid), public.my_provider_company_for_deal(uuid),
  public.add_deal_service_provider(uuid, uuid, text, text), public.remove_deal_service_provider(uuid),
  public.provider_update_shipment(uuid, public.shipment_status), public.my_provider_deals(), public.provider_deal_summary(uuid)
from public, anon;
grant execute on function
  public.provider_visible_doc(public.trade_doc_type), public.is_deal_provider(uuid), public.my_provider_company_for_deal(uuid),
  public.add_deal_service_provider(uuid, uuid, text, text), public.remove_deal_service_provider(uuid),
  public.provider_update_shipment(uuid, public.shipment_status), public.my_provider_deals(), public.provider_deal_summary(uuid)
to authenticated;
-- re-created functions keep their existing grants; restate the internal ones
revoke execute on function public.handle_new_user() from public, anon, authenticated;
