-- STEP 1 — run this in the OLD project's SQL editor (Supabase dashboard -> SQL Editor).
-- It returns ONE cell containing a ready-made SQL script that re-creates the
-- admin login users (with their existing password hashes, so passwords keep
-- working) in the new project. Copy that cell's value and run it in the NEW
-- project's SQL editor. The hashes only ever travel from one editor to the
-- other through your clipboard.
--
-- The generated script inserts only columns that exist in the new project and
-- aren't generated there (e.g. auth.users.confirmed_at), so it tolerates small
-- differences between the two projects' auth schema versions.
select
  'do $do$' || E'\n'
  || 'declare' || E'\n'
  || '  users_json jsonb := $json$' || (select coalesce(jsonb_agg(to_jsonb(u)), '[]'::jsonb)::text from auth.users u) || '$json$::jsonb;' || E'\n'
  || '  identities_json jsonb := $json$' || (select coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb)::text from auth.identities i) || '$json$::jsonb;' || E'\n'
  || '  cols text;' || E'\n'
  || 'begin' || E'\n'
  || '  select string_agg(quote_ident(c.column_name), '', '' order by c.ordinal_position) into cols' || E'\n'
  || '    from information_schema.columns c' || E'\n'
  || '   where c.table_schema = ''auth'' and c.table_name = ''users'' and c.is_generated = ''NEVER''' || E'\n'
  || '     and c.column_name in (select jsonb_object_keys(users_json -> 0));' || E'\n'
  || '  if cols is not null then' || E'\n'
  || '    execute format(''insert into auth.users (%1$s) select %1$s from jsonb_populate_recordset(null::auth.users, $1) on conflict (id) do nothing'', cols) using users_json;' || E'\n'
  || '  end if;' || E'\n'
  || '  select string_agg(quote_ident(c.column_name), '', '' order by c.ordinal_position) into cols' || E'\n'
  || '    from information_schema.columns c' || E'\n'
  || '   where c.table_schema = ''auth'' and c.table_name = ''identities'' and c.is_generated = ''NEVER''' || E'\n'
  || '     and c.column_name in (select jsonb_object_keys(identities_json -> 0));' || E'\n'
  || '  if cols is not null then' || E'\n'
  || '    execute format(''insert into auth.identities (%1$s) select %1$s from jsonb_populate_recordset(null::auth.identities, $1) on conflict (id) do nothing'', cols) using identities_json;' || E'\n'
  || '  end if;' || E'\n'
  || 'end' || E'\n'
  || '$do$;'
  as sql_to_run_in_new_project;
