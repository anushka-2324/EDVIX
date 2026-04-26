-- Patch: enforce EDVIX parking capacities + allow staff inserts
-- Run in Supabase SQL Editor

insert into public.parking_availability (zone, total_slots, occupied_slots, updated_at)
values
  ('Car Parking', 10, 0, now()),
  ('2-Wheeler Parking', 20, 0, now())
on conflict (zone) do update
set total_slots = excluded.total_slots,
    occupied_slots = least(excluded.total_slots, greatest(0, public.parking_availability.occupied_slots)),
    updated_at = now();

drop policy if exists "parking_insert_staff" on public.parking_availability;
create policy "parking_insert_staff"
on public.parking_availability for insert
with check (public.current_user_role() in ('faculty', 'admin'));
