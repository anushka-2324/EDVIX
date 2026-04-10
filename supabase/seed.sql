-- EDVIX demo seed data

insert into public.classes (name, subject, current_topic, qr_code, qr_updated_at, qr_expires_at, active)
values
  ('CS301 - Data Structures', 'Data Structures', 'Arrays & Complexity', 'CS30-DSTR-ARRAYS-AB12CD', now(), now() + interval '45 minutes', true),
  ('EC201 - Digital Systems', 'Digital Systems', 'Logic Gates', 'EC20-DSYS-LOGIC-EF56GH', now(), now() + interval '45 minutes', true),
  ('ME110 - Engineering Graphics', 'Engineering Graphics', 'Orthographic Projection', 'ME11-EGRA-ORTHO-IJ90KL', now(), now() + interval '45 minutes', true),
  ('MA205 - Probability & Stats', 'Probability & Statistics', 'Bayes Theorem', 'MA20-PSTA-BAYES-MN34OP', now(), now() + interval '45 minutes', true)
on conflict do nothing;

insert into public.buses (name, lat, lng, updated_at)
values
  ('Route A - North Gate', 12.9732, 77.5941, now()),
  ('Route B - City Center', 12.9708, 77.5960, now()),
  ('Route C - Metro Shuttle', 12.9699, 77.5932, now())
on conflict (name) do update
set lat = excluded.lat,
    lng = excluded.lng,
    updated_at = excluded.updated_at;

insert into public.parking_availability (zone, total_slots, occupied_slots, updated_at)
values
  ('Main Gate Parking', 120, 78, now()),
  ('Library Parking', 80, 52, now()),
  ('Hostel Parking', 60, 35, now())
on conflict (zone) do update
set total_slots = excluded.total_slots,
    occupied_slots = excluded.occupied_slots,
    updated_at = excluded.updated_at;

insert into public.alerts (title, message, type)
values
  ('Morning Assembly', 'All first-year students report to Main Auditorium by 9:00 AM.', 'class'),
  ('Bus Route B Delay', 'Route B is delayed by approximately 12 minutes due to traffic.', 'bus'),
  ('Hackathon Registration Open', 'Registrations for EDVIX Innovate close Friday 6 PM.', 'announcement');

-- Create a few demo issues linked to the first available user
DO $$
DECLARE
  first_user uuid;
  issue_one uuid;
BEGIN
  SELECT id INTO first_user FROM public.users LIMIT 1;

  IF first_user IS NOT NULL THEN
    INSERT INTO public.issues (user_id, title, description, status)
    VALUES
      (first_user, '[Infrastructure] Water cooler not working', 'Block C second floor cooler is leaking.', 'pending'),
      (first_user, '[Transport] Shuttle overcrowded', 'Evening shuttle at 5 PM is consistently overcrowded.', 'resolved')
    RETURNING id INTO issue_one;

    IF issue_one IS NOT NULL THEN
      INSERT INTO public.issue_history (issue_id, changed_by, previous_status, new_status, note)
      VALUES
        (issue_one, first_user, NULL, 'pending', 'Issue created from demo seed');
    END IF;
  END IF;
END $$;
