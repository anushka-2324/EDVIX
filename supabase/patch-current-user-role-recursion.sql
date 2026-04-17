-- Fix RLS recursion causing: stack depth limit exceeded
-- Apply in Supabase SQL Editor for project: dvzdiamocauhwqhmneep

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
