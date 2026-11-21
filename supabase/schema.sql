-- Loc'd In with Faith: studio storage. Run once in the new Supabase project's SQL editor.
-- Public visitors can read; only emails listed in studio_admins can change anything.
create table if not exists public.studio_admins (email text primary key);
create table if not exists public.site_images (slot text primary key, url text not null, updated_at timestamptz not null default now());
create table if not exists public.site_settings (key text primary key, value text not null default '', updated_at timestamptz not null default now());

alter table public.studio_admins enable row level security;
alter table public.site_images enable row level security;
alter table public.site_settings enable row level security;

create or replace function public.is_studio_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.studio_admins where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

create policy "public read images" on public.site_images for select using (true);
create policy "admin write images" on public.site_images for all to authenticated using (public.is_studio_admin()) with check (public.is_studio_admin());
create policy "public read settings" on public.site_settings for select using (key in ('pay_link_20','pay_link_50'));
create policy "admin write settings" on public.site_settings for all to authenticated using (public.is_studio_admin()) with check (public.is_studio_admin());

insert into storage.buckets (id, name, public) values ('site-images', 'site-images', true) on conflict (id) do nothing;
create policy "public read site-images" on storage.objects for select using (bucket_id = 'site-images');
create policy "admin upload site-images" on storage.objects for insert to authenticated with check (bucket_id = 'site-images' and public.is_studio_admin());
create policy "admin change site-images" on storage.objects for update to authenticated using (bucket_id = 'site-images' and public.is_studio_admin());
create policy "admin delete site-images" on storage.objects for delete to authenticated using (bucket_id = 'site-images' and public.is_studio_admin());

-- Faith's sign-in email (replace before running). Also add her as a user under Authentication > Users,
-- and add https://locdinwithfaith.oilgateai.com to Authentication > URL Configuration > Redirect URLs.
insert into public.studio_admins (email) values ('FAITH_EMAIL_HERE') on conflict do nothing;
