# Singapore → Frankfurt migration

Why: the Supabase project lives in Singapore (ap-southeast-1) while visitors
are in Israel; every query paid a ~230ms+ round trip. Target: Supabase
`eu-central-1` (Frankfurt) + Vercel functions in `fra1`, so the database,
storage, auth and server code all sit in the same region.

Everything is driven over the Supabase REST/Storage APIs (no Postgres client
needed). Scripts only WRITE to the new project, except `compress-in-place.mjs`
(explicit `--apply`). The old project is never modified by the migration and
stays as the rollback target until you delete it.

## Rehearsal (no impact on the live site)

1. Create the new Supabase project, region **Central EU (Frankfurt)**.
2. `bash scripts/frankfurt-migration/setup-env.sh` — hidden prompts for the new
   URL / anon key / service_role key → `.env.migration` (git-ignored).
3. `node scripts/frankfurt-migration/check-region.mjs` — new must say `eu-central-1`.
4. SQL editor of the NEW project: run `supabase/frankfurt-schema.sql`
   (all migrations in order; rebuild with `build-schema.sh` after adding one).
5. `node scripts/frankfurt-migration/verify-schema.mjs` — must print ✓.
6. Login users: run `auth-export.sql` in the OLD project's SQL editor, copy the
   single result cell, run it in the NEW project's SQL editor (keeps passwords).
7. `node scripts/frankfurt-migration/copy-storage.mjs` — compresses and uploads referenced images.
8. `node scripts/frankfurt-migration/copy-data.mjs` — upserts all rows, rewrites image URLs.
9. `node scripts/frankfurt-migration/verify-data.mjs` — must print “Everything matches”.

All of 7–9 are idempotent; re-run any time.

## Cutover (short window, quiet hour)

1. Re-run `copy-storage.mjs` and `copy-data.mjs --mirror` (final sync).
2. Vercel → Project → Settings → Environment Variables: set
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` to the NEW project's values (Production).
3. New project → Authentication → URL Configuration: Site URL
   `https://www.ybyroyoren.com`, same redirect URLs as the old project; also
   re-enable leaked-password protection.
4. Push the commit that sets `vercel.json` regions to `["fra1"]` — the deploy
   picks up the new env vars and the new region together.
5. After it is live: `copy-data.mjs --only-missing` to catch rows written to the
   old project during the switch. Never a plain run or `--mirror` here — those
   would overwrite rows the live site already updated in the new project.
6. Smoke test: shop, add to cart, admin login, upload an image, a test order.

Rollback: restore the three env vars to the old project, set `regions` back
to `["sin1"]`, redeploy. Keep the old project for about a week, then delete it.
