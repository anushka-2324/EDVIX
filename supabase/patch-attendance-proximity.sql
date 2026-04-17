alter table public.classes add column if not exists qr_origin_lat double precision;
alter table public.classes add column if not exists qr_origin_lng double precision;
alter table public.classes add column if not exists qr_generated_by uuid references public.users(id) on delete set null;
