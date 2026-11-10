-- =====================================================================
-- TICOSHOV · Migration 7 · Storage buckets and file access policies
--
-- public-assets  (public read): company logos, product images
--   companies/{company_id}/...           write: company managers
--   products/{company_id}/{product_id}/... write: company members
--
-- private-files  (no public access; signed URLs only, subject to RLS):
--   verification/{company_id}/...   company members + staff
--   rfq/{rfq_id}/...                anyone who can view the RFQ (buyer writes)
--   quotation/{quotation_id}/...    buyer + supplier of the quotation
--   conversation/{conv_id}/...      conversation parties + staff
--   deal/{deal_id}/...              deal parties + staff
--   commission/{commission_id}/...  commission parties + staff
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-assets', 'public-assets', true, 5242880,
   array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('private-files', 'private-files', false, 20971520,
   array['application/pdf', 'image/png', 'image/jpeg', 'image/webp',
         'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'text/csv', 'application/zip'])
on conflict (id) do nothing;

create or replace function public.try_uuid(p text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin
  return p::uuid;
exception when others then
  return null;
end $$;

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
      return public.is_deal_party(v_id) or public.is_staff();
    when 'commission' then
      return exists (select 1 from public.commissions c where c.id = v_id and (
               public.is_company_member(c.supplier_company_id)
               or (c.payer in ('buyer', 'both') and public.is_company_member(c.buyer_company_id))
               or public.is_staff()));
    else
      return false;
  end case;
end $$;
grant execute on function public.can_access_file(text, text, boolean), public.try_uuid(text) to authenticated;

create policy "ticoshov read private files" on storage.objects for select to authenticated
  using (bucket_id = 'private-files' and public.can_access_file(bucket_id, name, false));
create policy "ticoshov upload files" on storage.objects for insert to authenticated
  with check (bucket_id in ('public-assets', 'private-files') and public.can_access_file(bucket_id, name, true));
create policy "ticoshov update public assets" on storage.objects for update to authenticated
  using (bucket_id = 'public-assets' and public.can_access_file(bucket_id, name, true))
  with check (bucket_id = 'public-assets' and public.can_access_file(bucket_id, name, true));
-- private files can only be deleted by the uploader (a party cannot delete the other side's evidence)
create policy "ticoshov delete files" on storage.objects for delete to authenticated
  using (
    (bucket_id = 'public-assets' and public.can_access_file(bucket_id, name, true))
    or (bucket_id = 'private-files' and owner_id = (select auth.uid())::text
        and public.can_access_file(bucket_id, name, true)));
