-- The public seat meter should count everyone who is registered, not only
-- diners whose deposit is marked paid (same count the admin panel shows).
--
-- One exception: a website checkout that was started but never paid is not
-- allowed to hold seats forever. Such a registration only counts for 30
-- minutes after it was created (time to finish paying). Registrations
-- entered or touched by the owner in the admin panel always count.

alter table meal_registrations
  add column source text not null default 'web' check (source in ('web', 'admin'));

-- Registrations the owner entered by hand (no deposit expected from the site).
update meal_registrations set source = 'admin' where status = 'pending' and deposit_total = 0;

create or replace view meal_availability as
select
  m.id as meal_id,
  m.total_seats,
  coalesce(count(d.id) filter (where r.status <> 'cancelled' and (
    d.deposit_paid
    or r.status = 'paid'
    or r.source = 'admin'
    or r.created_at > now() - interval '30 minutes'
  )), 0)::int as taken_seats,
  m.total_seats - coalesce(count(d.id) filter (where r.status <> 'cancelled' and (
    d.deposit_paid
    or r.status = 'paid'
    or r.source = 'admin'
    or r.created_at > now() - interval '30 minutes'
  )), 0)::int as remaining_seats
from meals m
left join meal_registrations r on r.meal_id = m.id
left join meal_diners d on d.registration_id = r.id
group by m.id, m.total_seats;

alter view meal_availability set (security_invoker = true);
