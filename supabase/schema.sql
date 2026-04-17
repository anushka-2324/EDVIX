-- EDVIX Smart Campus Ecosystem
-- Run in Supabase SQL Editor

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('student', 'faculty', 'admin', 'bus_driver')),
  created_at timestamptz not null default now()
);

alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check
check (role in ('student', 'faculty', 'admin', 'bus_driver'));

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null default 'General',
  current_topic text,
  qr_code text not null,
  qr_updated_at timestamptz not null default now(),
  qr_expires_at timestamptz,
  qr_origin_lat double precision,
  qr_origin_lng double precision,
  qr_generated_by uuid references public.users(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.classes add column if not exists subject text;
update public.classes set subject = 'General' where subject is null;
alter table public.classes alter column subject set default 'General';
alter table public.classes alter column subject set not null;

alter table public.classes add column if not exists current_topic text;
alter table public.classes add column if not exists qr_updated_at timestamptz;
update public.classes set qr_updated_at = now() where qr_updated_at is null;
alter table public.classes alter column qr_updated_at set default now();
alter table public.classes alter column qr_updated_at set not null;
alter table public.classes add column if not exists qr_expires_at timestamptz;
alter table public.classes add column if not exists qr_origin_lat double precision;
alter table public.classes add column if not exists qr_origin_lng double precision;
alter table public.classes add column if not exists qr_generated_by uuid references public.users(id) on delete set null;

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  attendance_date date not null default current_date,
  status text not null default 'present' check (status in ('present', 'absent')),
  marked_by uuid references public.users(id) on delete set null,
  timestamp timestamptz not null default now()
);

alter table public.attendance add column if not exists attendance_date date;
update public.attendance set attendance_date = date(timestamp) where attendance_date is null;
alter table public.attendance alter column attendance_date set default current_date;
alter table public.attendance alter column attendance_date set not null;

alter table public.attendance add column if not exists status text;
update public.attendance set status = 'present' where status is null;
alter table public.attendance alter column status set default 'present';
alter table public.attendance alter column status set not null;
alter table public.attendance drop constraint if exists attendance_status_check;
alter table public.attendance add constraint attendance_status_check
check (status in ('present', 'absent'));

alter table public.attendance add column if not exists marked_by uuid references public.users(id) on delete set null;

drop index if exists attendance_unique_daily;
create unique index if not exists attendance_unique_daily
on public.attendance (user_id, class_id, attendance_date);

create table if not exists public.parking_availability (
  id uuid primary key default gen_random_uuid(),
  zone text not null unique,
  total_slots integer not null check (total_slots >= 0),
  occupied_slots integer not null default 0 check (occupied_slots >= 0 and occupied_slots <= total_slots),
  updated_at timestamptz not null default now()
);

create table if not exists public.buses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  lat double precision not null,
  lng double precision not null,
  pickup_area text,
  pickup_source text check (pickup_source in ('college', 'school')),
  driver_id uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.buses add column if not exists pickup_area text;
alter table public.buses add column if not exists pickup_source text;
alter table public.buses drop constraint if exists buses_pickup_source_check;
alter table public.buses add constraint buses_pickup_source_check
check (pickup_source in ('college', 'school'));
alter table public.buses add column if not exists driver_id uuid references public.users(id) on delete set null;

create table if not exists public.transport_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  preferred_bus_id uuid references public.buses(id) on delete set null,
  preferred_area text,
  preferred_source text check (preferred_source in ('college', 'school')),
  updated_at timestamptz not null default now()
);

alter table public.transport_preferences add column if not exists preferred_bus_id uuid references public.buses(id) on delete set null;
alter table public.transport_preferences add column if not exists preferred_area text;
alter table public.transport_preferences add column if not exists preferred_source text;
alter table public.transport_preferences drop constraint if exists transport_preferences_preferred_source_check;
alter table public.transport_preferences add constraint transport_preferences_preferred_source_check
check (preferred_source in ('college', 'school'));
alter table public.transport_preferences add column if not exists updated_at timestamptz;
update public.transport_preferences set updated_at = now() where updated_at is null;
alter table public.transport_preferences alter column updated_at set default now();
alter table public.transport_preferences alter column updated_at set not null;

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  type text not null check (type in ('class', 'bus', 'announcement')),
  created_at timestamptz not null default now()
);

create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text not null,
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.issue_history (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  changed_by uuid references public.users(id) on delete set null,
  previous_status text,
  new_status text not null,
  note text,
  changed_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.current_user_role()
returns text
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  current_role text;
begin
  select role into current_role
  from public.users
  where id = auth.uid()
  limit 1;

  return current_role;
end;
$$;

create or replace function public.is_valid_college_email(email_input text)
returns boolean
language sql
immutable
as $$
  select
    array_length(string_to_array(lower(trim(email_input)), '@'), 1) = 2
    and split_part(lower(trim(email_input)), '@', 1) <> ''
    and split_part(lower(trim(email_input)), '@', 2) = 'jspm.edu.in';
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_valid_college_email(new.email) then
    raise exception 'Only @jspm.edu.in email addresses are allowed for signup';
  end if;

  insert into public.users (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'student')
  )
  on conflict (id) do update
  set
    name = excluded.name,
    email = excluded.email,
    role = excluded.role;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.touch_issue_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists issue_updated_at on public.issues;
create trigger issue_updated_at
before update on public.issues
for each row execute procedure public.touch_issue_updated_at();

create or replace function public.touch_parking_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists parking_updated_at on public.parking_availability;
create trigger parking_updated_at
before update on public.parking_availability
for each row execute procedure public.touch_parking_updated_at();

-- RLS
alter table public.users enable row level security;
alter table public.classes enable row level security;
alter table public.attendance enable row level security;
alter table public.buses enable row level security;
alter table public.parking_availability enable row level security;
alter table public.alerts enable row level security;
alter table public.issues enable row level security;
alter table public.issue_history enable row level security;
alter table public.notifications enable row level security;
alter table public.transport_preferences enable row level security;

-- Users policies
drop policy if exists "users_select_own_or_admin" on public.users;
create policy "users_select_own_or_admin"
on public.users for select
using (id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "users_insert_self" on public.users;
create policy "users_insert_self"
on public.users for insert
with check (id = auth.uid());

drop policy if exists "users_update_self_or_admin" on public.users;
create policy "users_update_self_or_admin"
on public.users for update
using (id = auth.uid() or public.current_user_role() = 'admin')
with check (id = auth.uid() or public.current_user_role() = 'admin');

-- Classes policies
drop policy if exists "classes_read_authenticated" on public.classes;
create policy "classes_read_authenticated"
on public.classes for select
using (auth.uid() is not null);

drop policy if exists "classes_manage_faculty_admin" on public.classes;
create policy "classes_manage_faculty_admin"
on public.classes for all
using (public.current_user_role() in ('faculty', 'admin'))
with check (public.current_user_role() in ('faculty', 'admin'));

-- Attendance policies
drop policy if exists "attendance_select_self_or_staff" on public.attendance;
create policy "attendance_select_self_or_staff"
on public.attendance for select
using (user_id = auth.uid() or public.current_user_role() in ('faculty', 'admin'));

drop policy if exists "attendance_insert_self" on public.attendance;
drop policy if exists "attendance_insert_self_or_staff" on public.attendance;
create policy "attendance_insert_self_or_staff"
on public.attendance for insert
with check (user_id = auth.uid() or public.current_user_role() in ('faculty', 'admin'));

drop policy if exists "attendance_update_staff" on public.attendance;
create policy "attendance_update_staff"
on public.attendance for update
using (public.current_user_role() in ('faculty', 'admin'))
with check (public.current_user_role() in ('faculty', 'admin'));

-- Buses policies
drop policy if exists "buses_read_authenticated" on public.buses;
create policy "buses_read_authenticated"
on public.buses for select
using (auth.uid() is not null);

drop policy if exists "buses_manage_authenticated" on public.buses;
drop policy if exists "buses_manage_staff_driver" on public.buses;
create policy "buses_manage_staff_driver"
on public.buses for update
using (public.current_user_role() in ('admin', 'faculty', 'bus_driver'))
with check (public.current_user_role() in ('admin', 'faculty', 'bus_driver'));

-- Transport preferences policies
drop policy if exists "transport_preferences_select_own_or_admin" on public.transport_preferences;
create policy "transport_preferences_select_own_or_admin"
on public.transport_preferences for select
using (user_id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "transport_preferences_insert_own" on public.transport_preferences;
create policy "transport_preferences_insert_own"
on public.transport_preferences for insert
with check (user_id = auth.uid());

drop policy if exists "transport_preferences_update_own" on public.transport_preferences;
create policy "transport_preferences_update_own"
on public.transport_preferences for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Parking policies
drop policy if exists "parking_read_authenticated" on public.parking_availability;
create policy "parking_read_authenticated"
on public.parking_availability for select
using (auth.uid() is not null);

drop policy if exists "parking_manage_staff" on public.parking_availability;
create policy "parking_manage_staff"
on public.parking_availability for update
using (public.current_user_role() in ('faculty', 'admin'))
with check (public.current_user_role() in ('faculty', 'admin'));

-- Alerts policies
drop policy if exists "alerts_read_authenticated" on public.alerts;
create policy "alerts_read_authenticated"
on public.alerts for select
using (auth.uid() is not null);

drop policy if exists "alerts_insert_staff" on public.alerts;
create policy "alerts_insert_staff"
on public.alerts for insert
with check (public.current_user_role() in ('faculty', 'admin'));

-- Issues policies
drop policy if exists "issues_select_self_or_staff" on public.issues;
create policy "issues_select_self_or_staff"
on public.issues for select
using (user_id = auth.uid() or public.current_user_role() in ('faculty', 'admin'));

drop policy if exists "issues_insert_self" on public.issues;
create policy "issues_insert_self"
on public.issues for insert
with check (user_id = auth.uid());

drop policy if exists "issues_update_staff" on public.issues;
create policy "issues_update_staff"
on public.issues for update
using (public.current_user_role() in ('faculty', 'admin'))
with check (public.current_user_role() in ('faculty', 'admin'));

-- Issue history policies
drop policy if exists "issue_history_select_related" on public.issue_history;
create policy "issue_history_select_related"
on public.issue_history for select
using (
  public.current_user_role() in ('faculty', 'admin')
  or exists (
    select 1 from public.issues i where i.id = issue_id and i.user_id = auth.uid()
  )
);

drop policy if exists "issue_history_insert_authenticated" on public.issue_history;
create policy "issue_history_insert_authenticated"
on public.issue_history for insert
with check (auth.uid() is not null);

-- Notifications policies
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications for select
using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "notifications_insert_staff" on public.notifications;
create policy "notifications_insert_staff"
on public.notifications for insert
with check (public.current_user_role() in ('faculty', 'admin'));

-- Storage bucket for issue images
insert into storage.buckets (id, name, public)
values ('issue-images', 'issue-images', true)
on conflict (id) do nothing;

drop policy if exists "issue_images_public_read" on storage.objects;
create policy "issue_images_public_read"
on storage.objects for select
using (bucket_id = 'issue-images');

drop policy if exists "issue_images_authenticated_upload" on storage.objects;
create policy "issue_images_authenticated_upload"
on storage.objects for insert
with check (bucket_id = 'issue-images' and auth.uid() is not null);
