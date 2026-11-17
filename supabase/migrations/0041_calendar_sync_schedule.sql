-- Runs the Google Calendar sync every 15 minutes, so changes made in Google reach the site on their own.
-- The database calls /api/cron/calendar-sync on the site; the shared secret is created here and kept in
-- integration_settings (never written into the job itself).

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

insert into integration_settings (name, value)
values ('CALENDAR_CRON_SECRET', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (name) do nothing;

select cron.schedule(
  'calendar-sync',
  '*/15 * * * *',
  $job$
    select net.http_get(
      url := 'https://www.ybyroyoren.com/api/cron/calendar-sync',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (select value from public.integration_settings where name = 'CALENDAR_CRON_SECRET')
      ),
      timeout_milliseconds := 30000
    );
  $job$
);
