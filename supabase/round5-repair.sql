-- Loc'd In with Faith — Round 5 Replacement & Admin Repair Migration (2026-11-23)
-- Project: ibialnlmhcdinleajkud (https://ibialnlmhcdinleajkud.supabase.co)
-- Idempotent and additive. Preserves all existing bookings, photos, decisions, and studio_admins roster.
-- NOTE: Do not alter studio_admins in this migration.

-- 1. Extend public.bookings for first-party site requests, owner-scoped client visibility, and consent records
alter table public.bookings
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists email_updates_opt_in boolean not null default true,
  add column if not exists sms_updates_opt_in boolean not null default false,
  add column if not exists sms_consent_at timestamptz,
  add column if not exists client_change_request text not null default '' check (char_length(client_change_request) <= 500),
  add column if not exists client_change_requested_at timestamptz;

do $$
declare
  c_name text;
begin
  for c_name in
    select conname
      from pg_constraint
     where conrelid = 'public.bookings'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%source%'
  loop
    execute format('alter table public.bookings drop constraint %I', c_name);
  end loop;
end $$;

alter table public.bookings
  add constraint bookings_source_check
  check (source in ('cal_com', 'manual_proof', 'site_request'));

create index if not exists idx_bookings_user_id
  on public.bookings (user_id, created_at desc)
  where user_id is not null;

drop policy if exists "clients insert pending bookings" on public.bookings;
create policy "clients insert pending bookings" on public.bookings
  for insert to anon, authenticated
  with check (
    status = 'pending_deposit'
    and confirmed_by is null
    and confirmed_at is null
    and (user_id is null or user_id = auth.uid())
  );

drop policy if exists "clients read own bookings" on public.bookings;
create policy "clients read own bookings" on public.bookings
  for select to authenticated
  using (auth.uid() = user_id);

-- Narrow RPC letting signed-in clients submit a reschedule/cancel note on their OWN booking only
create or replace function public.request_client_booking_change(
  p_booking_id uuid,
  p_note text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_note text := left(trim(coalesce(p_note, '')), 500);
begin
  if v_uid is null or p_booking_id is null or char_length(v_note) < 3 then
    return false;
  end if;
  update public.bookings
     set client_change_request = v_note,
         client_change_requested_at = now()
   where id = p_booking_id
     and user_id = v_uid;
  return found;
end;
$$;

revoke all on function public.request_client_booking_change(uuid, text) from public;
grant execute on function public.request_client_booking_change(uuid, text) to authenticated;

-- 2. Authenticated client profiles & notification preferences (owner-scoped by auth.uid())
create table if not exists public.client_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 160),
  phone text not null default '' check (char_length(phone) <= 40),
  preferred_service text not null default 'retwist' check (preferred_service in ('retwist', 'all3', 'reattach', 'fullhead', 'treatment', 'mobile')),
  email_updates_opt_in boolean not null default true,
  sms_updates_opt_in boolean not null default false,
  sms_consent_at timestamptz,
  notes text not null default '' check (char_length(notes) <= 500),
  updated_at timestamptz not null default now()
);

alter table public.client_profiles enable row level security;

drop policy if exists "client read own profile" on public.client_profiles;
create policy "client read own profile" on public.client_profiles
  for select to authenticated
  using (auth.uid() = user_id or public.is_studio_admin());

drop policy if exists "client insert own profile" on public.client_profiles;
create policy "client insert own profile" on public.client_profiles
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "client update own profile" on public.client_profiles;
create policy "client update own profile" on public.client_profiles
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. First-party moderated reviews + verified GlossGenius provenance imports
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null check (char_length(trim(author_name)) between 2 and 80),
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 800),
  service_name text not null default '' check (char_length(service_name) <= 120),
  source text not null default 'site' check (source in ('site', 'glossgenius_import')),
  source_ref text unique,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by text check (reviewed_by is null or char_length(reviewed_by) <= 254),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_reviews_status_created
  on public.reviews (status, created_at desc);

alter table public.reviews enable row level security;

drop policy if exists "public read approved reviews" on public.reviews;
create policy "public read approved reviews" on public.reviews
  for select to anon, authenticated
  using (status = 'approved');

drop policy if exists "admin read all reviews" on public.reviews;
create policy "admin read all reviews" on public.reviews
  for select to authenticated
  using (public.is_studio_admin());

drop policy if exists "clients submit pending reviews" on public.reviews;
create policy "clients submit pending reviews" on public.reviews
  for insert to anon, authenticated
  with check (
    status = 'pending'
    and source = 'site'
    and reviewed_by is null
    and reviewed_at is null
    and (user_id is null or user_id = auth.uid())
  );

drop policy if exists "admin update reviews" on public.reviews;
create policy "admin update reviews" on public.reviews
  for update to authenticated
  using (public.is_studio_admin())
  with check (public.is_studio_admin());

drop policy if exists "admin delete reviews" on public.reviews;
create policy "admin delete reviews" on public.reviews
  for delete to authenticated
  using (public.is_studio_admin());

-- Seed ONLY the 2 real, verified GlossGenius reviews with exact provenance (never invent quotes or ratings)
insert into public.reviews (author_name, rating, comment, service_name, source, source_ref, status, created_at)
values
  (
    'Syd',
    5,
    'Faith was super welcoming, did a great job and worked fast 10/10 I’ll definitely be back. Glad to finally find someone',
    '',
    'glossgenius_import',
    'glossgenius:5559127',
    'approved',
    '2026-11-13T23:40:42.805Z'::timestamptz
  ),
  (
    'sosa',
    5,
    '',
    '',
    'glossgenius_import',
    'glossgenius:5535548',
    'approved',
    '2026-11-07T08:54:43.508Z'::timestamptz
  )
on conflict (source_ref) do nothing;

-- 4. Extended public site_settings keys (hours, specific gallery/reel URLs, schema readiness, honest SMS flag)
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
    'real_site_schema_ready',
    'round5_repair_schema_ready',
    'studio_hours_json',
    'reel_url_1',
    'reel_url_2',
    'reel_url_3',
    'reel_url_4',
    'personal_url_1',
    'personal_url_2',
    'personal_url_3',
    'personal_url_4',
    'sms_notifications_live'
  ));

insert into public.site_settings (key, value) values
  ('round5_repair_schema_ready', 'true'),
  ('sms_notifications_live', 'false')
on conflict (key) do nothing;

update public.site_settings
   set value = 'true',
       updated_at = now()
 where key = 'round5_repair_schema_ready';

-- 5. Close legacy Round 3 anonymous upload policy on the public site-images bucket
drop policy if exists "decisions upload site-images" on storage.objects;
