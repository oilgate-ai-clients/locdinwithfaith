-- Loc'd In with Faith — Builder Admin Access & Allowlist RPCs
-- Project: ibialnlmhcdinleajkud (https://ibialnlmhcdinleajkud.supabase.co)
-- Idempotent. Run in Supabase SQL Editor.

insert into public.studio_admins (email)
values ('oilgateai@gmail.com')
on conflict do nothing;

create or replace function public.admin_email_allowed(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.studio_admins
    where lower(email) = lower(trim(p_email))
  );
$$;

revoke all on function public.admin_email_allowed(text) from public;
grant execute on function public.admin_email_allowed(text) to anon, authenticated;

grant execute on function public.is_studio_admin() to authenticated;
