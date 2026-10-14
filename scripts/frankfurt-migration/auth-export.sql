-- STEP 1 — run this in the OLD project's SQL editor (Supabase dashboard -> SQL Editor).
-- It returns ONE cell containing a ready-made SQL script that re-creates the
-- admin login users (with their existing password hashes, so passwords keep
-- working) in the new project. Copy that cell's value and run it in the NEW
-- project's SQL editor. The hashes only ever travel from one editor to the
-- other through your clipboard.
select
  'insert into auth.users select * from jsonb_populate_recordset(null::auth.users, $json$'
  || (select coalesce(jsonb_agg(to_jsonb(u) - 'confirmed_at'), '[]'::jsonb)::text from auth.users u)
  || '$json$::jsonb) on conflict (id) do nothing;' || E'\n'
  || 'insert into auth.identities select * from jsonb_populate_recordset(null::auth.identities, $json$'
  || (select coalesce(jsonb_agg(to_jsonb(i) - 'email'), '[]'::jsonb)::text from auth.identities i)
  || '$json$::jsonb) on conflict (id) do nothing;'
  as sql_to_run_in_new_project;
