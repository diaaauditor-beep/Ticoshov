-- =====================================================================
-- TICOSHOV · Migration 6 · Workflow functions
-- Every privileged state change goes through one of these SECURITY DEFINER
-- functions. Each one authorizes the caller explicitly before acting.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Utilities
-- ---------------------------------------------------------------------
create or replace function public.setting_numeric(p_key text, p_default numeric)
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce((select (value #>> '{}')::numeric from public.platform_settings where key = p_key), p_default)
$$;

create or replace function public.notify_user(p_user uuid, p_type text, p_payload jsonb, p_link text)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, type, payload, link) values (p_user, p_type, coalesce(p_payload, '{}'), p_link)
$$;

create or replace function public.notify_company(p_company uuid, p_type text, p_payload jsonb, p_link text, p_except uuid default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, type, payload, link)
  select m.user_id, p_type, coalesce(p_payload, '{}'), p_link
  from public.company_members m join public.profiles p on p.id = m.user_id and p.is_active
  where m.company_id = p_company and (p_except is null or m.user_id <> p_except)
$$;

create or replace function public.notify_staff(p_type text, p_payload jsonb, p_link text)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, type, payload, link)
  select p.id, p_type, coalesce(p_payload, '{}'), p_link
  from public.profiles p where p.role in ('admin', 'operations') and p.is_active
$$;

create or replace function public.log_admin_action(p_action text, p_table text, p_target uuid, p_details jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.admin_actions (actor_id, action, target_table, target_id, details)
  values (auth.uid(), p_action, p_table, p_target, coalesce(p_details, '{}'))
$$;

create or replace function public.require_auth()
returns uuid language plpgsql stable set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  return auth.uid();
end $$;

-- ---------------------------------------------------------------------
-- New auth user → profile. Self-registration may only choose buyer or
-- supplier; admin/operations roles are granted by an administrator.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_role public.user_role := 'buyer';
  v_locale text := coalesce(new.raw_user_meta_data ->> 'locale', 'ar');
begin
  if (new.raw_user_meta_data ->> 'role') = 'supplier' then
    v_role := 'supplier';
  end if;
  if v_locale not in ('ar', 'en') then v_locale := 'ar'; end if;
  insert into public.profiles (id, role, full_name, preferred_locale)
  values (new.id, v_role, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120), v_locale);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Company onboarding
-- ---------------------------------------------------------------------
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
begin
  select role into v_role from public.profiles where id = v_uid and is_active;
  if v_role is null or v_role not in ('supplier', 'buyer') then
    raise exception 'Only supplier or buyer accounts can register a company' using errcode = '42501';
  end if;
  if exists (select 1 from public.company_members where user_id = v_uid) then
    raise exception 'You already belong to a company' using errcode = '23505';
  end if;
  v_kind := v_role::text::public.company_kind;

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

  if p_category_ids is not null then
    insert into public.company_categories (company_id, category_id)
    select v_id, c.id from public.categories c where c.id = any(p_category_ids)
    on conflict do nothing;
  end if;

  if v_kind = 'supplier' then
    insert into public.supplier_verifications (company_id, status) values (v_id, 'pending');
  else
    -- Buyers do not need document verification to send RFQs; staff can still review them.
    update public.companies set verification_status = 'approved', verified_at = null where id = v_id;
  end if;
  return v_id;
end $$;

-- Supplier submits (or re-submits) its verification file for review
create or replace function public.submit_verification(p_company uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_auth();
  v_ver record;
begin
  if not public.is_company_manager(p_company) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select * into v_ver from public.supplier_verifications
   where company_id = p_company order by created_at desc limit 1;
  if not found or v_ver.status not in ('pending', 'needs_documents', 'rejected') then
    raise exception 'Verification is not awaiting documents' using errcode = '22023';
  end if;
  if v_ver.status = 'rejected' then
    -- start a fresh verification cycle; documents are re-uploaded
    insert into public.supplier_verifications (company_id, status) values (p_company, 'pending') returning * into v_ver;
  end if;
  if not exists (select 1 from public.verification_documents where verification_id = v_ver.id) then
    raise exception 'Upload at least one document before submitting' using errcode = '22023';
  end if;
  update public.supplier_verifications
     set status = 'pending', submitted_by = v_uid, submitted_at = now()
   where id = v_ver.id;
  update public.companies set verification_status = 'pending' where id = p_company;
  perform public.notify_staff('verification_submitted', jsonb_build_object('company_id', p_company),
    '/admin/verifications/' || v_ver.id);
end $$;

-- Staff decision on a verification
create or replace function public.review_verification(
  p_verification uuid, p_status public.verification_status, p_message text, p_internal_notes text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_ver record;
begin
  perform public.require_auth();
  if not public.is_staff() then raise exception 'Staff only' using errcode = '42501'; end if;
  if p_status = 'pending' then raise exception 'Invalid decision' using errcode = '22023'; end if;
  select * into v_ver from public.supplier_verifications where id = p_verification for update;
  if not found then raise exception 'Verification not found' using errcode = 'P0002'; end if;

  update public.supplier_verifications
     set status = p_status, reviewed_by = auth.uid(), reviewed_at = now(),
         message_to_company = nullif(trim(p_message), ''),
         internal_notes = coalesce(nullif(trim(p_internal_notes), ''), internal_notes)
   where id = p_verification;
  update public.companies
     set verification_status = p_status,
         verified_at = case when p_status = 'approved' then now() else null end
   where id = v_ver.company_id;
  -- Unverified suppliers' listings disappear from the marketplace automatically via RLS.
  perform public.notify_company(v_ver.company_id, 'verification_' || p_status::text,
    jsonb_build_object('message', p_message), '/dashboard/verification');
  perform public.log_admin_action('verification.' || p_status::text, 'supplier_verifications', p_verification,
    jsonb_build_object('company_id', v_ver.company_id));
end $$;

-- ---------------------------------------------------------------------
-- RFQs
-- ---------------------------------------------------------------------
create or replace function public.rfq_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.reference := 'RFQ-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.rfq_reference_seq')::text, 6, '0');
  if new.product_id is not null and new.category_id is null then
    select category_id into new.category_id from public.products where id = new.product_id;
  end if;
  if new.product_id is not null and new.target_company_id is null then
    select company_id into new.target_company_id from public.products where id = new.product_id;
  end if;
  if new.expires_at > now() + interval '180 days' then
    raise exception 'RFQ validity cannot exceed 180 days' using errcode = '22023';
  end if;
  return new;
end $$;
create trigger rfqs_before_insert before insert on public.rfqs
  for each row execute function public.rfq_before_insert();

create or replace function public.rfq_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_company uuid;
begin
  for v_company in
    select c.id from public.companies c
    where c.kind = 'supplier' and c.verification_status = 'approved' and c.is_active
      and (
        (new.target_company_id is not null and c.id = new.target_company_id)
        or (new.target_company_id is null and exists (
              select 1 from public.company_categories cc
              join public.categories cat on cat.id = new.category_id
              where cc.company_id = c.id and cc.category_id in (cat.id, cat.parent_id))))
  loop
    perform public.notify_company(v_company, 'rfq_new',
      jsonb_build_object('reference', new.reference, 'title', new.title), '/dashboard/rfqs/' || new.id);
  end loop;
  return null;
end $$;
create trigger rfqs_after_insert after insert on public.rfqs
  for each row execute function public.rfq_after_insert();

-- ---------------------------------------------------------------------
-- Quotations
-- ---------------------------------------------------------------------
create or replace function public.quotation_before_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.total_amount := round(new.unit_price * new.quantity, 2);
  if new.valid_until < current_date then
    raise exception 'Quotation validity date is in the past' using errcode = '22023';
  end if;
  return new;
end $$;
create trigger quotations_before_write before insert or update of unit_price, quantity, valid_until on public.quotations
  for each row execute function public.quotation_before_write();

create or replace function public.quotation_after_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_rfq record;
begin
  select * into v_rfq from public.rfqs where id = new.rfq_id;
  if tg_op = 'INSERT' then
    perform public.notify_company(v_rfq.buyer_company_id, 'quotation_new',
      jsonb_build_object('reference', v_rfq.reference, 'title', v_rfq.title), '/dashboard/rfqs/' || v_rfq.id);
  elsif new.revision > old.revision then
    perform public.notify_company(v_rfq.buyer_company_id, 'quotation_revised',
      jsonb_build_object('reference', v_rfq.reference, 'title', v_rfq.title), '/dashboard/rfqs/' || v_rfq.id);
    -- keep a negotiating deal's value in sync with the latest revision
    update public.deals set deal_value = new.total_amount, currency_code = new.currency_code
     where quotation_id = new.id and status = 'negotiation';
  elsif new.status = 'withdrawn' and old.status <> 'withdrawn' then
    perform public.notify_company(v_rfq.buyer_company_id, 'quotation_withdrawn',
      jsonb_build_object('reference', v_rfq.reference), '/dashboard/rfqs/' || v_rfq.id);
    update public.deals set status = 'cancelled', cancelled_at = now()
     where quotation_id = new.id and status = 'negotiation';
  end if;
  return null;
end $$;
create trigger quotations_after_write after insert or update on public.quotations
  for each row execute function public.quotation_after_write();

create or replace function public.reject_quotation(p_quotation uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_q record;
begin
  perform public.require_auth();
  select q.*, r.buyer_company_id, r.reference into v_q
    from public.quotations q join public.rfqs r on r.id = q.rfq_id where q.id = p_quotation for update of q;
  if not found then raise exception 'Quotation not found' using errcode = 'P0002'; end if;
  if not public.is_company_member(v_q.buyer_company_id) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if v_q.status not in ('submitted', 'negotiating') then
    raise exception 'Quotation cannot be rejected in its current status' using errcode = '22023';
  end if;
  update public.quotations set status = 'rejected', notes = notes where id = p_quotation;
  update public.deals set status = 'cancelled', cancelled_at = now()
   where quotation_id = p_quotation and status = 'negotiation';
  perform public.notify_company(v_q.supplier_company_id, 'quotation_rejected',
    jsonb_build_object('reference', v_q.reference, 'reason', p_reason), '/dashboard/quotations');
end $$;

-- ---------------------------------------------------------------------
-- Conversations
-- ---------------------------------------------------------------------
create or replace function public.open_conversation(p_quotation uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_q record;
  v_id uuid;
begin
  perform public.require_auth();
  select q.id, q.rfq_id, q.supplier_company_id, r.buyer_company_id, r.title, r.reference into v_q
    from public.quotations q join public.rfqs r on r.id = q.rfq_id where q.id = p_quotation;
  if not found then raise exception 'Quotation not found' using errcode = 'P0002'; end if;
  if not (public.is_company_member(v_q.buyer_company_id) or public.is_company_member(v_q.supplier_company_id)) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  insert into public.conversations (rfq_id, quotation_id, buyer_company_id, supplier_company_id, subject)
  values (v_q.rfq_id, v_q.id, v_q.buyer_company_id, v_q.supplier_company_id, v_q.reference || ' · ' || left(v_q.title, 150))
  on conflict (rfq_id, supplier_company_id) do update set quotation_id = excluded.quotation_id
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.message_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_c record;
  v_link text;
begin
  select * into v_c from public.conversations where id = new.conversation_id;
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  v_link := case when v_c.deal_id is not null then '/dashboard/deals/' || v_c.deal_id
                 else '/dashboard/messages/' || v_c.id end;
  if new.sender_company_id is distinct from v_c.buyer_company_id then
    perform public.notify_company(v_c.buyer_company_id, 'message_new', jsonb_build_object('subject', v_c.subject), v_link, new.sender_id);
  end if;
  if new.sender_company_id is distinct from v_c.supplier_company_id then
    perform public.notify_company(v_c.supplier_company_id, 'message_new', jsonb_build_object('subject', v_c.subject), v_link, new.sender_id);
  end if;
  return null;
end $$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.message_after_insert();

-- ---------------------------------------------------------------------
-- Commission rate resolution: supplier > buyer > category (incl. parent)
-- > supplier country > platform default.
-- ---------------------------------------------------------------------
create or replace function public.resolve_commission_rate(
  p_supplier uuid, p_buyer uuid, p_category uuid, out rate numeric, out source text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_parent uuid;
  v_country char(2);
begin
  select r.rate, 'supplier' into rate, source from public.commission_rules r
   where r.is_active and r.scope = 'supplier' and r.supplier_company_id = p_supplier
   order by r.created_at desc limit 1;
  if found then return; end if;

  select r.rate, 'buyer' into rate, source from public.commission_rules r
   where r.is_active and r.scope = 'buyer' and r.buyer_company_id = p_buyer
   order by r.created_at desc limit 1;
  if found then return; end if;

  if p_category is not null then
    select parent_id into v_parent from public.categories where id = p_category;
    select r.rate, 'category' into rate, source from public.commission_rules r
     where r.is_active and r.scope = 'category' and r.category_id in (p_category, v_parent)
     order by (r.category_id = p_category) desc, r.created_at desc limit 1;
    if found then return; end if;
  end if;

  select country_code into v_country from public.companies where id = p_supplier;
  select r.rate, 'country' into rate, source from public.commission_rules r
   where r.is_active and r.scope = 'country' and r.country_code = v_country
   order by r.created_at desc limit 1;
  if found then return; end if;

  rate := public.setting_numeric('default_commission_rate', 5);
  source := 'default';
end $$;

create or replace function public.commission_before_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.amount := round(new.deal_value * new.rate / 100, 2);
  return new;
end $$;
create trigger commissions_before_write before insert or update of rate, deal_value on public.commissions
  for each row execute function public.commission_before_write();

-- ---------------------------------------------------------------------
-- Deals
-- ---------------------------------------------------------------------
create or replace function public.next_deal_reference()
returns text language sql security definer set search_path = '' as $$
  select 'TCS-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.deal_reference_seq')::text, 6, '0')
$$;

create or replace function public.record_deal_status(p_deal uuid, p_from public.deal_status, p_to public.deal_status, p_note text)
returns void language sql security definer set search_path = '' as $$
  insert into public.deal_status_history (deal_id, from_status, to_status, changed_by, note)
  values (p_deal, p_from, p_to, auth.uid(), nullif(trim(p_note), ''))
$$;

-- Buyer opens a negotiation on a quotation: creates the deal record in
-- 'negotiation' status and links the conversation.
create or replace function public.start_negotiation(p_quotation uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_q record;
  v_deal uuid;
  v_conv uuid;
begin
  perform public.require_auth();
  select q.*, r.buyer_company_id, r.title, r.status as rfq_status, r.reference as rfq_reference
    into v_q from public.quotations q join public.rfqs r on r.id = q.rfq_id
   where q.id = p_quotation for update of q;
  if not found then raise exception 'Quotation not found' using errcode = 'P0002'; end if;
  if not public.is_company_member(v_q.buyer_company_id) then raise exception 'Not allowed' using errcode = '42501'; end if;

  select id into v_deal from public.deals where quotation_id = p_quotation;
  if v_deal is not null then return v_deal; end if;

  if v_q.status <> 'submitted' or v_q.rfq_status <> 'open' then
    raise exception 'Negotiation can only start on an active quotation' using errcode = '22023';
  end if;

  insert into public.deals (reference, rfq_id, quotation_id, buyer_company_id, supplier_company_id, title,
    deal_value, currency_code, incoterm, status, created_by)
  values (public.next_deal_reference(), v_q.rfq_id, v_q.id, v_q.buyer_company_id, v_q.supplier_company_id,
    v_q.title, v_q.total_amount, v_q.currency_code, v_q.incoterm, 'negotiation', auth.uid())
  returning id into v_deal;
  perform public.record_deal_status(v_deal, null, 'negotiation', null);
  update public.quotations set status = 'negotiating' where id = p_quotation;

  v_conv := public.open_conversation(p_quotation);
  update public.conversations set deal_id = v_deal where id = v_conv;

  perform public.notify_company(v_q.supplier_company_id, 'deal_negotiation',
    jsonb_build_object('reference', v_q.rfq_reference), '/dashboard/deals/' || v_deal);
  return v_deal;
end $$;

create or replace function public.accept_quotation(p_quotation uuid, p_note text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_q record;
  v_deal record;
  v_deal_id uuid;
  v_conv uuid;
  v_rate record;
begin
  perform public.require_auth();
  select q.*, r.buyer_company_id, r.title, r.status as rfq_status, r.category_id, r.reference as rfq_reference
    into v_q from public.quotations q join public.rfqs r on r.id = q.rfq_id
   where q.id = p_quotation for update of q;
  if not found then raise exception 'Quotation not found' using errcode = 'P0002'; end if;
  if not public.is_company_member(v_q.buyer_company_id) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if v_q.status not in ('submitted', 'negotiating') then
    raise exception 'Quotation is not open for acceptance' using errcode = '22023';
  end if;
  if v_q.valid_until < current_date then
    update public.quotations set status = 'expired' where id = p_quotation;
    raise exception 'Quotation has expired' using errcode = '22023';
  end if;
  if v_q.rfq_status <> 'open' then raise exception 'RFQ is no longer open' using errcode = '22023'; end if;

  select * into v_deal from public.deals where quotation_id = p_quotation for update;
  if found then
    v_deal_id := v_deal.id;
    update public.deals
       set status = 'quotation_accepted', accepted_at = now(),
           deal_value = v_q.total_amount, currency_code = v_q.currency_code, incoterm = v_q.incoterm
     where id = v_deal_id;
    perform public.record_deal_status(v_deal_id, v_deal.status, 'quotation_accepted', p_note);
  else
    insert into public.deals (reference, rfq_id, quotation_id, buyer_company_id, supplier_company_id, title,
      deal_value, currency_code, incoterm, status, accepted_at, created_by)
    values (public.next_deal_reference(), v_q.rfq_id, v_q.id, v_q.buyer_company_id, v_q.supplier_company_id,
      v_q.title, v_q.total_amount, v_q.currency_code, v_q.incoterm, 'quotation_accepted', now(), auth.uid())
    returning id into v_deal_id;
    perform public.record_deal_status(v_deal_id, null, 'quotation_accepted', p_note);
  end if;

  update public.quotations set status = 'accepted' where id = p_quotation;
  -- other offers on this RFQ are closed
  update public.quotations set status = 'rejected'
   where rfq_id = v_q.rfq_id and id <> p_quotation and status in ('submitted', 'negotiating');
  update public.deals set status = 'cancelled', cancelled_at = now()
   where rfq_id = v_q.rfq_id and id <> v_deal_id and status = 'negotiation';
  update public.rfqs set status = 'awarded' where id = v_q.rfq_id;

  v_conv := public.open_conversation(p_quotation);
  update public.conversations set deal_id = v_deal_id where id = v_conv and deal_id is null;

  -- Commission obligation is tracked (status pending) — never charged automatically.
  select * into v_rate from public.resolve_commission_rate(v_q.supplier_company_id, v_q.buyer_company_id, v_q.category_id);
  insert into public.commissions (deal_id, deal_value, rate, amount, currency_code,
    supplier_company_id, buyer_company_id, rate_source, status)
  values (v_deal_id, v_q.total_amount, v_rate.rate, 0, v_q.currency_code,
    v_q.supplier_company_id, v_q.buyer_company_id, v_rate.source, 'pending')
  on conflict (deal_id) do update set deal_value = excluded.deal_value, rate = excluded.rate,
    currency_code = excluded.currency_code, rate_source = excluded.rate_source;

  perform public.notify_company(v_q.supplier_company_id, 'quotation_accepted',
    jsonb_build_object('reference', v_q.rfq_reference), '/dashboard/deals/' || v_deal_id);
  return v_deal_id;
end $$;

-- Status transitions. Matrix of (from → to) and who may perform them.
create or replace function public.update_deal_status(p_deal uuid, p_to public.deal_status, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_d record;
  v_is_buyer boolean;
  v_is_supplier boolean;
  v_staff boolean := public.is_staff();
  v_ok boolean := false;
begin
  perform public.require_auth();
  select * into v_d from public.deals where id = p_deal for update;
  if not found then raise exception 'Deal not found' using errcode = 'P0002'; end if;
  v_is_buyer := public.is_company_member(v_d.buyer_company_id);
  v_is_supplier := public.is_company_member(v_d.supplier_company_id);
  if not (v_is_buyer or v_is_supplier or v_staff) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if v_d.status = p_to then return; end if;
  if v_d.status in ('completed', 'cancelled') and not public.is_admin() then
    raise exception 'Deal is closed' using errcode = '22023';
  end if;
  if v_d.status = 'disputed' or p_to = 'disputed' then
    raise exception 'Use the dispute workflow' using errcode = '22023';
  end if;
  if p_to in ('quotation_accepted', 'negotiation') and not v_staff then
    raise exception 'Use the quotation workflow' using errcode = '22023';
  end if;

  v_ok := case
    when v_staff then true
    when p_to = 'cancelled' then v_d.status in ('negotiation', 'quotation_accepted', 'awaiting_payment_confirmation')
    when v_d.status = 'quotation_accepted' and p_to = 'awaiting_payment_confirmation' then true
    when v_d.status = 'payment_confirmed' and p_to = 'production' then v_is_supplier
    when v_d.status = 'production' and p_to = 'ready_for_shipment' then v_is_supplier
    when v_d.status = 'ready_for_shipment' and p_to = 'shipped' then v_is_supplier
    when v_d.status = 'shipped' and p_to = 'delivered' then v_is_buyer
    when v_d.status = 'delivered' and p_to = 'completed' then v_is_buyer
    else false end;
  if not v_ok then
    raise exception 'Transition % → % is not allowed for your role', v_d.status, p_to using errcode = '42501';
  end if;

  update public.deals
     set status = p_to,
         completed_at = case when p_to = 'completed' then now() else completed_at end,
         cancelled_at = case when p_to = 'cancelled' then now() else cancelled_at end
   where id = p_deal;
  perform public.record_deal_status(p_deal, v_d.status, p_to, p_note);

  if p_to = 'completed' then
    update public.commissions
       set status = case when amount_paid >= amount then 'paid'::public.commission_status
                         when amount_paid > 0 then 'partially_paid'::public.commission_status
                         else 'due'::public.commission_status end,
           due_date = current_date + public.setting_numeric('commission_due_days', 30)::int
     where deal_id = p_deal and status in ('pending', 'partially_paid');
  elsif p_to = 'cancelled' then
    update public.commissions
       set status = 'waived', admin_notes = concat_ws(E'\n', admin_notes, 'Auto-waived: deal cancelled')
     where deal_id = p_deal and amount_paid = 0 and status in ('pending', 'due');
    update public.quotations set status = 'withdrawn'
     where id = v_d.quotation_id and status = 'negotiating';
  end if;

  if v_staff and not (v_is_buyer or v_is_supplier) then
    perform public.log_admin_action('deal.status', 'deals', p_deal,
      jsonb_build_object('from', v_d.status, 'to', p_to, 'note', p_note));
  end if;
  perform public.notify_company(v_d.buyer_company_id, 'deal_status',
    jsonb_build_object('reference', v_d.reference, 'status', p_to), '/dashboard/deals/' || p_deal, auth.uid());
  perform public.notify_company(v_d.supplier_company_id, 'deal_status',
    jsonb_build_object('reference', v_d.reference, 'status', p_to), '/dashboard/deals/' || p_deal, auth.uid());
end $$;

-- Each party declares that payment between them was made/received.
-- TICOSHOV records the declarations; it does not verify or hold funds.
create or replace function public.declare_payment(p_deal uuid, p_note text default null)
returns public.deal_status language plpgsql security definer set search_path = '' as $$
declare
  v_d record;
  v_is_buyer boolean;
  v_is_supplier boolean;
  v_from public.deal_status;
begin
  perform public.require_auth();
  select * into v_d from public.deals where id = p_deal for update;
  if not found then raise exception 'Deal not found' using errcode = 'P0002'; end if;
  v_is_buyer := public.is_company_member(v_d.buyer_company_id);
  v_is_supplier := public.is_company_member(v_d.supplier_company_id);
  if not (v_is_buyer or v_is_supplier) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if v_d.status not in ('quotation_accepted', 'awaiting_payment_confirmation') then
    raise exception 'Payment can be declared only after the quotation is accepted' using errcode = '22023';
  end if;
  v_from := v_d.status;
  if v_d.status = 'quotation_accepted' then
    update public.deals set status = 'awaiting_payment_confirmation' where id = p_deal;
    perform public.record_deal_status(p_deal, v_from, 'awaiting_payment_confirmation', null);
    v_from := 'awaiting_payment_confirmation';
  end if;
  update public.deals
     set buyer_payment_declared_at = case when v_is_buyer then coalesce(buyer_payment_declared_at, now()) else buyer_payment_declared_at end,
         supplier_payment_declared_at = case when v_is_supplier then coalesce(supplier_payment_declared_at, now()) else supplier_payment_declared_at end
   where id = p_deal
  returning * into v_d;
  if v_d.buyer_payment_declared_at is not null and v_d.supplier_payment_declared_at is not null then
    update public.deals set status = 'payment_confirmed' where id = p_deal;
    perform public.record_deal_status(p_deal, v_from, 'payment_confirmed',
      coalesce(p_note, 'Confirmed by both parties (declared, not independently verified by TICOSHOV)'));
    perform public.notify_company(v_d.buyer_company_id, 'deal_status',
      jsonb_build_object('reference', v_d.reference, 'status', 'payment_confirmed'), '/dashboard/deals/' || p_deal);
    perform public.notify_company(v_d.supplier_company_id, 'deal_status',
      jsonb_build_object('reference', v_d.reference, 'status', 'payment_confirmed'), '/dashboard/deals/' || p_deal);
    return 'payment_confirmed'::public.deal_status;
  end if;
  perform public.notify_company(case when v_is_buyer then v_d.supplier_company_id else v_d.buyer_company_id end,
    'payment_declared', jsonb_build_object('reference', v_d.reference), '/dashboard/deals/' || p_deal);
  return 'awaiting_payment_confirmation'::public.deal_status;
end $$;

-- ---------------------------------------------------------------------
-- Disputes
-- ---------------------------------------------------------------------
create or replace function public.open_dispute(p_deal uuid, p_reason text, p_description text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_d record;
  v_mine uuid;
  v_against uuid;
  v_id uuid;
begin
  perform public.require_auth();
  select * into v_d from public.deals where id = p_deal for update;
  if not found then raise exception 'Deal not found' using errcode = 'P0002'; end if;
  if public.is_company_member(v_d.buyer_company_id) then
    v_mine := v_d.buyer_company_id; v_against := v_d.supplier_company_id;
  elsif public.is_company_member(v_d.supplier_company_id) then
    v_mine := v_d.supplier_company_id; v_against := v_d.buyer_company_id;
  else
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if v_d.status in ('negotiation', 'cancelled') then
    raise exception 'A dispute cannot be opened at this stage' using errcode = '22023';
  end if;
  if exists (select 1 from public.disputes where deal_id = p_deal and status in ('open', 'under_review')) then
    raise exception 'An active dispute already exists for this deal' using errcode = '23505';
  end if;
  insert into public.disputes (deal_id, raised_by, raised_by_company_id, against_company_id, reason, description)
  values (p_deal, auth.uid(), v_mine, v_against, p_reason, p_description) returning id into v_id;
  if v_d.status <> 'disputed' then
    update public.deals set status = 'disputed', status_before_dispute = v_d.status where id = p_deal;
    perform public.record_deal_status(p_deal, v_d.status, 'disputed', 'Dispute opened');
  end if;
  perform public.notify_company(v_against, 'dispute_opened', jsonb_build_object('reference', v_d.reference), '/dashboard/deals/' || p_deal);
  perform public.notify_staff('dispute_opened', jsonb_build_object('reference', v_d.reference), '/admin/disputes/' || v_id);
  return v_id;
end $$;

-- Staff resolves: the deal resumes its previous status, or is completed/cancelled.
create or replace function public.resolve_dispute(p_dispute uuid, p_resolution text, p_deal_outcome text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_disp record;
  v_d record;
  v_to public.deal_status;
begin
  perform public.require_auth();
  if not public.is_staff() then raise exception 'Staff only' using errcode = '42501'; end if;
  if p_deal_outcome not in ('resume', 'completed', 'cancelled') then
    raise exception 'Invalid outcome' using errcode = '22023';
  end if;
  select * into v_disp from public.disputes where id = p_dispute for update;
  if not found then raise exception 'Dispute not found' using errcode = 'P0002'; end if;
  update public.disputes set status = 'resolved', resolution = p_resolution, resolved_at = now(),
    assigned_to = coalesce(assigned_to, auth.uid()) where id = p_dispute;

  select * into v_d from public.deals where id = v_disp.deal_id for update;
  if v_d.status = 'disputed' and not exists (
       select 1 from public.disputes where deal_id = v_d.id and id <> p_dispute and status in ('open', 'under_review')) then
    v_to := case p_deal_outcome when 'resume' then coalesce(v_d.status_before_dispute, 'quotation_accepted')
                                when 'completed' then 'completed' else 'cancelled' end;
    update public.deals set status = v_to, status_before_dispute = null,
      completed_at = case when v_to = 'completed' then now() else completed_at end,
      cancelled_at = case when v_to = 'cancelled' then now() else cancelled_at end
     where id = v_d.id;
    perform public.record_deal_status(v_d.id, 'disputed', v_to, 'Dispute resolved: ' || left(p_resolution, 500));
    if v_to = 'completed' then
      update public.commissions set status = 'due',
        due_date = current_date + public.setting_numeric('commission_due_days', 30)::int
       where deal_id = v_d.id and status = 'pending';
    elsif v_to = 'cancelled' then
      update public.commissions set status = 'waived'
       where deal_id = v_d.id and amount_paid = 0 and status in ('pending', 'due');
    end if;
  end if;
  perform public.notify_company(v_d.buyer_company_id, 'dispute_resolved', jsonb_build_object('reference', v_d.reference), '/dashboard/deals/' || v_d.id);
  perform public.notify_company(v_d.supplier_company_id, 'dispute_resolved', jsonb_build_object('reference', v_d.reference), '/dashboard/deals/' || v_d.id);
  perform public.log_admin_action('dispute.resolve', 'disputes', p_dispute,
    jsonb_build_object('outcome', p_deal_outcome));
end $$;

-- ---------------------------------------------------------------------
-- Commission payments (reviewed by administrators)
-- ---------------------------------------------------------------------
create or replace function public.review_commission_payment(p_payment uuid, p_approve boolean, p_notes text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_p record;
  v_c record;
  v_paid numeric;
begin
  perform public.require_auth();
  if not public.is_admin() then raise exception 'Administrators only' using errcode = '42501'; end if;
  select * into v_p from public.commission_payments where id = p_payment for update;
  if not found then raise exception 'Payment not found' using errcode = 'P0002'; end if;
  if v_p.status <> 'submitted' then raise exception 'Payment already reviewed' using errcode = '22023'; end if;
  update public.commission_payments
     set status = case when p_approve then 'confirmed'::public.commission_payment_status else 'rejected'::public.commission_payment_status end,
         reviewed_by = auth.uid(), reviewed_at = now(), notes = coalesce(nullif(trim(p_notes), ''), notes)
   where id = p_payment;

  select coalesce(sum(amount), 0) into v_paid from public.commission_payments
   where commission_id = v_p.commission_id and status = 'confirmed';
  select * into v_c from public.commissions where id = v_p.commission_id for update;
  update public.commissions
     set amount_paid = v_paid,
         status = case
           when v_c.status = 'waived' then 'waived'::public.commission_status
           when v_paid >= v_c.amount and v_c.amount > 0 then 'paid'::public.commission_status
           when v_paid > 0 then 'partially_paid'::public.commission_status
           else v_c.status end
   where id = v_c.id;
  perform public.notify_company(v_c.supplier_company_id,
    case when p_approve then 'commission_payment_confirmed' else 'commission_payment_rejected' end,
    jsonb_build_object('amount', v_p.amount, 'currency', v_c.currency_code), '/dashboard/commissions');
  perform public.log_admin_action(case when p_approve then 'commission_payment.confirm' else 'commission_payment.reject' end,
    'commission_payments', p_payment, jsonb_build_object('amount', v_p.amount));
end $$;

-- Mark due commissions as overdue. Safe to run on a schedule (pg_cron) or from the admin UI.
create or replace function public.refresh_overdue_commissions()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  if public.is_client_request() and not public.is_staff() then
    raise exception 'Staff only' using errcode = '42501';
  end if;
  update public.commissions set status = 'overdue'
   where status in ('due', 'partially_paid') and due_date < current_date and amount_paid < amount;
  get diagnostics v_count = row_count;
  -- expire stale quotations and RFQs at the same time
  update public.quotations set status = 'expired' where status = 'submitted' and valid_until < current_date;
  update public.rfqs set status = 'closed' where status = 'open' and expires_at < now();
  return v_count;
end $$;

-- ---------------------------------------------------------------------
-- Admin analytics
-- ---------------------------------------------------------------------
create or replace function public.admin_dashboard_stats(
  p_from timestamptz default null, p_to timestamptz default null, p_country char(2) default null,
  p_category uuid default null, p_supplier uuid default null, p_status public.deal_status default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_from timestamptz := coalesce(p_from, '-infinity'::timestamptz);
  v_to timestamptz := coalesce(p_to, 'infinity'::timestamptz);
  v_result jsonb;
begin
  if not public.is_staff() then raise exception 'Staff only' using errcode = '42501'; end if;

  with
  f_deals as (
    select d.*, r.category_id, s.country_code as supplier_country, b.country_code as buyer_country
    from public.deals d
    left join public.rfqs r on r.id = d.rfq_id
    join public.companies s on s.id = d.supplier_company_id
    join public.companies b on b.id = d.buyer_company_id
    where d.created_at between v_from and v_to
      and (p_country is null or p_country in (s.country_code, b.country_code))
      and (p_category is null or r.category_id = p_category
           or r.category_id in (select id from public.categories where parent_id = p_category))
      and (p_supplier is null or d.supplier_company_id = p_supplier)
      and (p_status is null or d.status = p_status)),
  f_rfqs as (
    select r.* from public.rfqs r join public.companies b on b.id = r.buyer_company_id
    where r.created_at between v_from and v_to
      and (p_country is null or p_country in (b.country_code, r.delivery_country))
      and (p_category is null or r.category_id = p_category
           or r.category_id in (select id from public.categories where parent_id = p_category))),
  f_quotes as (
    select q.* from public.quotations q join f_rfqs r on r.id = q.rfq_id
    where (p_supplier is null or q.supplier_company_id = p_supplier)),
  f_comm as (
    select c.* from public.commissions c join f_deals d on d.id = c.deal_id)
  select jsonb_build_object(
    'total_users', (select count(*) from public.profiles),
    'users_by_role', (select coalesce(jsonb_object_agg(role, n), '{}') from (select role, count(*) n from public.profiles group by role) x),
    'approved_suppliers', (select count(*) from public.companies where kind = 'supplier' and verification_status = 'approved' and is_active
                             and (p_country is null or country_code = p_country)),
    'pending_verifications', (select count(*) from public.supplier_verifications where status in ('pending', 'under_review') and submitted_at is not null),
    'active_buyers', (select count(distinct buyer_company_id) from f_rfqs),
    'published_products', (select count(*) from public.products p where p.status = 'published'
                             and (p_category is null or p.category_id = p_category
                                  or p.category_id in (select id from public.categories where parent_id = p_category))
                             and (p_supplier is null or p.company_id = p_supplier)
                             and (p_country is null or p.origin_country = p_country)),
    'active_rfqs', (select count(*) from f_rfqs where status = 'open' and expires_at > now()),
    'submitted_quotations', (select count(*) from f_quotes),
    'deals_in_progress', (select count(*) from f_deals where status not in ('completed', 'cancelled')),
    'deals_completed', (select count(*) from f_deals where status = 'completed'),
    'open_disputes', (select count(*) from public.disputes ds join f_deals d on d.id = ds.deal_id where ds.status in ('open', 'under_review')),
    'transaction_value', (select coalesce(jsonb_object_agg(currency_code, v), '{}') from (
        select currency_code, sum(deal_value) v from f_deals
        where status not in ('negotiation', 'cancelled') group by currency_code) x),
    'expected_commissions', (select coalesce(jsonb_object_agg(currency_code, v), '{}') from (
        select currency_code, sum(amount - amount_paid) v from f_comm
        where status in ('pending', 'due', 'partially_paid', 'overdue') group by currency_code) x),
    'collected_commissions', (select coalesce(jsonb_object_agg(currency_code, v), '{}') from (
        select currency_code, sum(amount_paid) v from f_comm group by currency_code having sum(amount_paid) > 0) x),
    'overdue_commissions', (select coalesce(jsonb_object_agg(currency_code, v), '{}') from (
        select currency_code, sum(amount - amount_paid) v from f_comm where status = 'overdue' group by currency_code) x),
    'deals_by_status', (select coalesce(jsonb_object_agg(status, n), '{}') from (select status, count(*) n from f_deals group by status) x),
    'deals_by_month', (select coalesce(jsonb_agg(jsonb_build_object('month', m, 'count', n) order by m), '[]') from (
        select to_char(date_trunc('month', created_at), 'YYYY-MM') m, count(*) n from f_deals group by 1) x),
    'rfqs_by_month', (select coalesce(jsonb_agg(jsonb_build_object('month', m, 'count', n) order by m), '[]') from (
        select to_char(date_trunc('month', created_at), 'YYYY-MM') m, count(*) n from f_rfqs group by 1) x),
    'top_categories', (select coalesce(jsonb_agg(jsonb_build_object('category_id', category_id, 'count', n) order by n desc), '[]') from (
        select category_id, count(*) n from f_rfqs where category_id is not null group by 1 order by 2 desc limit 8) x)
  ) into v_result;
  return v_result;
end $$;

-- ---------------------------------------------------------------------
-- Function privileges: nothing executable by anonymous visitors except
-- read-only helpers used inside RLS policies.
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on function public.auth_role(), public.is_admin(), public.is_staff(), public.is_client_request(),
  public.is_company_member(uuid), public.is_company_manager(uuid), public.my_company_ids(),
  public.my_approved_supplier_ids(), public.can_view_rfq(uuid), public.is_deal_party(uuid),
  public.is_conversation_party(uuid) to anon;
-- internal helpers are not callable from the API at all
revoke execute on function public.notify_user(uuid, text, jsonb, text), public.notify_company(uuid, text, jsonb, text, uuid),
  public.notify_staff(text, jsonb, text), public.log_admin_action(text, text, uuid, jsonb),
  public.record_deal_status(uuid, public.deal_status, public.deal_status, text), public.next_deal_reference(),
  public.handle_new_user(), public.audit_trigger()
from authenticated;
grant usage on sequence public.rfq_reference_seq, public.deal_reference_seq to authenticated;
