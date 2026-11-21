-- Loc'd In with Faith — Round 3 SQL (for Pam to apply in Supabase SQL Editor)
-- Adds: extended public site_settings keys, interactive decision_answers table, client_photos table + storage bucket, and decision image uploads.

-- 1. Allow visitors to read public site settings (active logo, hero verse vs sales toggle, optional SMS sign-in flag, Stripe links)
drop policy if exists "public read settings" on public.site_settings;
create policy "public read settings" on public.site_settings
  for select using (key in (
    'pay_link_20',
    'pay_link_50',
    'active_logo',
    'hero_verse_mode',
    'hero_sales_line',
    'sms_signin_enabled',
    'round3_schema_ready'
  ));

insert into public.site_settings (key, value)
values ('round3_schema_ready', 'true')
on conflict (key) do update set value = 'true';

-- 2. Interactive answers from decisions.html (Faith fills out; LaVante reads in Admin)
create table if not exists public.decision_answers (
  question_key text primary key check (question_key ~ '^[a-z0-9_-]{1,64}$'),
  answer jsonb not null default '{}'::jsonb check (octet_length(answer::text) <= 16000),
  updated_by text not null default 'faith',
  updated_at timestamptz not null default now()
);

alter table public.decision_answers enable row level security;

drop policy if exists "public read decision answers" on public.decision_answers;
create policy "public read decision answers" on public.decision_answers
  for select to anon, authenticated using (true);

-- Note: anon write allows Faith to answer & save directly on decisions.html before handover;
-- after Faith's admin email is added to studio_admins, Pam can restrict these to public.is_studio_admin().
drop policy if exists "public insert decision answers" on public.decision_answers;
create policy "public insert decision answers" on public.decision_answers
  for insert to anon, authenticated with check (true);

drop policy if exists "public update decision answers" on public.decision_answers;
create policy "public update decision answers" on public.decision_answers
  for update to anon, authenticated using (true) with check (true);

drop policy if exists "admin delete decision answers" on public.decision_answers;
create policy "admin delete decision answers" on public.decision_answers
  for delete to authenticated using (public.is_studio_admin());

-- 3. Client account photo uploads (reattachment consultation photos, current locs, style inspo)
create table if not exists public.client_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  user_email text not null default '',
  category text not null default 'inspo' check (category in ('consultation', 'current_locs', 'inspo')),
  caption text not null default '' check (char_length(caption) <= 200),
  storage_path text not null,
  public_url text not null,
  created_at timestamptz not null default now()
);

alter table public.client_photos enable row level security;

drop policy if exists "client read own photos" on public.client_photos;
create policy "client read own photos" on public.client_photos
  for select to authenticated using (auth.uid() = user_id or public.is_studio_admin());

drop policy if exists "client insert own photos" on public.client_photos;
create policy "client insert own photos" on public.client_photos
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "client delete own photos" on public.client_photos;
create policy "client delete own photos" on public.client_photos
  for delete to authenticated using (auth.uid() = user_id or public.is_studio_admin());

-- 4. Storage bucket for client photos (each signed-in client writes only inside <uid>/*)
insert into storage.buckets (id, name, public)
values ('client-photos', 'client-photos', true)
on conflict (id) do nothing;

drop policy if exists "public read client-photos" on storage.objects;
create policy "public read client-photos" on storage.objects
  for select using (bucket_id = 'client-photos');

drop policy if exists "client upload own client-photos" on storage.objects;
create policy "client upload own client-photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'client-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "client delete own client-photos" on storage.objects;
create policy "client delete own client-photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'client-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_studio_admin()));

-- 5. Allow decision uploads into site-images/decisions/* from decisions.html
drop policy if exists "decisions upload site-images" on storage.objects;
create policy "decisions upload site-images" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'site-images' and (storage.foldername(name))[1] = 'decisions');
