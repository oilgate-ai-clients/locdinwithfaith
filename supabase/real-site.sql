-- Loc'd In with Faith — Real Site Migration (2026-11-21)
-- Project: ibialnlmhcdinleajkud (https://ibialnlmhcdinleajkud.supabase.co)
-- Run once in Supabase SQL Editor. Idempotent and preserves all existing photos and saved decision answers.
--
-- ALSO CHECK IN SUPABASE DASHBOARD -> AUTHENTICATION:
-- 1. URL Configuration -> Site URL:
--      https://locdinwithfaith.oilgateai.com
-- 2. URL Configuration -> Redirect URLs (add all):
--      https://locdinwithfaith.oilgateai.com
--      https://locdinwithfaith.oilgateai.com/*
--      https://locdinwithfaith.oilgateai.com/#admin
--      https://locdinwithfaith.oilgateai.com/admin/
-- 3. Providers -> Phone: leave OFF (Email only).
-- 4. Email Templates -> Magic Link (Email OTP):
--      Subject: Your Loc'd In with Faith studio sign-in code
--      Body:
--        <h2>Sign in to Loc'd In with Faith Studio Admin</h2>
--        <p>Use this 6-digit code to sign in:</p>
--        <p style="font-size:28px;font-weight:700;letter-spacing:4px">{{ .Token }}</p>
--        <p>Or click the button below:</p>
--        <p><a href="{{ .ConfirmationURL }}">Open Studio Admin</a></p>
--        <p style="color:#666;font-size:12px">Loc'd In with Faith · Central Phoenix, AZ</p>

-- 1. Update public-readable site_settings keys (Cal.com link, pay handles, deposit amounts, active logo)
drop policy if exists "public read settings" on public.site_settings;
create policy "public read settings" on public.site_settings
  for select using (key in (
    'active_logo',
    'cal_com_url',
    'cal_slug_retwist',
    'cal_slug_all3',
    'cal_slug_reattach',
    'cal_slug_mobile',
    'pay_cashapp',
    'pay_venmo',
    'pay_zelle',
    'pay_applepay',
    'pay_other',
    'deposit_retwist',
    'deposit_all3',
    'deposit_reattach',
    'deposit_mobile',
    'round3_schema_ready',
    'real_site_schema_ready'
  ));

-- Seed defaults without overwriting any saved values
insert into public.site_settings (key, value) values
  ('real_site_schema_ready', 'true'),
  ('deposit_retwist', '20'),
  ('deposit_all3', '20'),
  ('deposit_reattach', '50'),
  ('deposit_mobile', '20'),
  ('pay_zelle', '(480) 806-7675')
on conflict (key) do nothing;

update public.site_settings set value = 'true', updated_at = now() where key = 'real_site_schema_ready';

-- 2. Bookings & deposit proof tracking table
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_name text not null default '' check (char_length(client_name) <= 160),
  client_email text not null check (char_length(client_email) between 3 and 254),
  client_phone text not null default '' check (char_length(client_phone) <= 40),
  service_name text not null default 'Retwist + Style' check (char_length(service_name) <= 160),
  appointment_time timestamptz,
  appointment_label text not null default '' check (char_length(appointment_label) <= 160),
  deposit_amount numeric(10,2) not null default 20 check (deposit_amount >= 0 and deposit_amount <= 1000),
  status text not null default 'pending_deposit' check (status in ('pending_deposit', 'confirmed')),
  source text not null default 'cal_com' check (source in ('cal_com', 'manual_proof')),
  cal_booking_uid text check (cal_booking_uid is null or char_length(cal_booking_uid) <= 128),
  proof_path text check (proof_path is null or char_length(proof_path) <= 400),
  proof_uploaded_at timestamptz,
  confirmed_by text check (confirmed_by is null or char_length(confirmed_by) <= 254),
  confirmed_at timestamptz,
  notes text not null default '' check (char_length(notes) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists idx_bookings_status_time
  on public.bookings (status, appointment_time asc nulls last, created_at desc);

alter table public.bookings enable row level security;

-- Clients can submit a new pending booking or manual deposit proof, but CANNOT read, list, update, or delete any rows.
drop policy if exists "clients insert pending bookings" on public.bookings;
create policy "clients insert pending bookings" on public.bookings
  for insert to anon, authenticated
  with check (
    status = 'pending_deposit'
    and confirmed_by is null
    and confirmed_at is null
  );

-- Only signed-in studio admins can view, confirm/undo, or delete bookings.
drop policy if exists "admin read bookings" on public.bookings;
create policy "admin read bookings" on public.bookings
  for select to authenticated
  using (public.is_studio_admin());

drop policy if exists "admin update bookings" on public.bookings;
create policy "admin update bookings" on public.bookings
  for update to authenticated
  using (public.is_studio_admin())
  with check (public.is_studio_admin());

drop policy if exists "admin delete bookings" on public.bookings;
create policy "admin delete bookings" on public.bookings
  for delete to authenticated
  using (public.is_studio_admin());

-- Safe narrow RPC so a client who just booked via Cal.com can attach their uploaded screenshot path
-- without granting SELECT or general UPDATE access on bookings.
create or replace function public.attach_deposit_proof(
  p_booking_id uuid,
  p_proof_path text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_booking_id is null or p_proof_path is null or p_proof_path not like (p_booking_id::text || '/%') then
    return false;
  end if;
  update public.bookings
     set proof_path = p_proof_path,
         proof_uploaded_at = now()
   where id = p_booking_id
     and status = 'pending_deposit';
  return found;
end;
$$;

revoke all on function public.attach_deposit_proof(uuid, text) from public;
grant execute on function public.attach_deposit_proof(uuid, text) to anon, authenticated;

-- 3. PRIVATE storage bucket for client deposit proof screenshots
-- Clients: INSERT-only (no read, no list, no update, no delete).
-- Signed-in studio admin: SELECT (signed URLs) and DELETE.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'deposit-proofs',
  'deposit-proofs',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do update
  set public = false,
      file_size_limit = 10485760,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "clients insert deposit-proofs" on storage.objects;
create policy "clients insert deposit-proofs" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'deposit-proofs'
    and name ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'
  );

drop policy if exists "admin read deposit-proofs" on storage.objects;
create policy "admin read deposit-proofs" on storage.objects
  for select to authenticated
  using (bucket_id = 'deposit-proofs' and public.is_studio_admin());

drop policy if exists "admin delete deposit-proofs" on storage.objects;
create policy "admin delete deposit-proofs" on storage.objects
  for delete to authenticated
  using (bucket_id = 'deposit-proofs' and public.is_studio_admin());

-- 4. Lock decision_answers writes to signed-in studio admins (decisions now live inside Admin)
drop policy if exists "public read decision answers" on public.decision_answers;
drop policy if exists "public insert decision answers" on public.decision_answers;
drop policy if exists "public update decision answers" on public.decision_answers;

drop policy if exists "admin read decision answers" on public.decision_answers;
create policy "admin read decision answers" on public.decision_answers
  for select to authenticated
  using (public.is_studio_admin());

drop policy if exists "admin insert decision answers" on public.decision_answers;
create policy "admin insert decision answers" on public.decision_answers
  for insert to authenticated
  with check (public.is_studio_admin());

drop policy if exists "admin update decision answers" on public.decision_answers;
create policy "admin update decision answers" on public.decision_answers
  for update to authenticated
  using (public.is_studio_admin())
  with check (public.is_studio_admin());
