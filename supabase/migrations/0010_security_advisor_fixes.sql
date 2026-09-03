-- categories was added in 0008 without RLS, unlike every other table
-- (see the "RLS: enabled everywhere, no policies" block in 0001_init.sql).
-- No policies needed: the app only ever reads/writes it via the
-- service-role client, which bypasses RLS regardless.
alter table categories enable row level security;

-- meal_availability runs as its owner by default, so it can bypass RLS on
-- meals/meal_registrations for anyone querying it directly (e.g. via the
-- public anon key over PostgREST). security_invoker makes it run as the
-- querying role instead, so an anon caller gets nothing while the
-- service-role client (which bypasses RLS either way) is unaffected.
alter view meal_availability set (security_invoker = true);
