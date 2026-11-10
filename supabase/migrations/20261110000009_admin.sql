-- =====================================================================
-- TICOSHOV · Migration 9 · Administration helpers
-- =====================================================================

-- Staff user directory (auth.users.email is not exposed through the API otherwise).
create or replace function public.admin_list_users(p_search text default null, p_role public.user_role default null)
returns table (id uuid, email text, full_name text, role public.user_role, is_active boolean, email_confirmed boolean,
               created_at timestamptz, last_sign_in_at timestamptz, company_id uuid, company_name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'Staff only' using errcode = '42501'; end if;
  return query
  select p.id, u.email::text, p.full_name, p.role, p.is_active, u.email_confirmed_at is not null,
         p.created_at, u.last_sign_in_at, c.id, c.name
  from public.profiles p
  join auth.users u on u.id = p.id
  left join lateral (
    select cm.company_id from public.company_members cm where cm.user_id = p.id order by cm.created_at limit 1) m on true
  left join public.companies c on c.id = m.company_id
  where (p_role is null or p.role = p_role)
    and (p_search is null or p_search = '' or p.full_name ilike '%' || p_search || '%' or u.email ilike '%' || p_search || '%')
  order by p.created_at desc
  limit 500;
end $$;

-- Role / status changes by administrators, recorded as admin actions.
create or replace function public.admin_set_user(p_user uuid, p_role public.user_role, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Administrators only' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'Administrators cannot change their own role or status' using errcode = '42501'; end if;
  update public.profiles set role = p_role, is_active = p_active where id = p_user;
  perform public.log_admin_action('user.update', 'profiles', p_user, jsonb_build_object('role', p_role, 'active', p_active));
end $$;

-- Staff starts reviewing a verification file
create or replace function public.start_verification_review(p_verification uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v record;
begin
  if not public.is_staff() then raise exception 'Staff only' using errcode = '42501'; end if;
  update public.supplier_verifications set status = 'under_review', reviewed_by = auth.uid()
   where id = p_verification and status = 'pending' returning * into v;
  if found then
    update public.companies set verification_status = 'under_review' where id = v.company_id;
    perform public.notify_company(v.company_id, 'verification_under_review', '{}'::jsonb, '/dashboard/verification');
    perform public.log_admin_action('verification.under_review', 'supplier_verifications', p_verification, '{}'::jsonb);
  end if;
end $$;

revoke execute on function public.admin_list_users(text, public.user_role), public.admin_set_user(uuid, public.user_role, boolean),
  public.start_verification_review(uuid) from public, anon;
grant execute on function public.admin_list_users(text, public.user_role), public.admin_set_user(uuid, public.user_role, boolean),
  public.start_verification_review(uuid) to authenticated;
