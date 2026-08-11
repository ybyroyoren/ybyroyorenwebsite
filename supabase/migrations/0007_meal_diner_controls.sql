-- Per-diner deposit tracking, decoupled from registration-level Grow status,
-- so admins can move/split diners between meals and mark manually-collected
-- deposits (e.g. paid in person, not through the site) independently of the
-- online payment flow.
alter table meal_diners
  add column deposit_paid boolean not null default false;

-- Backfill: diners already tied to a paid registration are considered paid.
update meal_diners d
set deposit_paid = true
from meal_registrations r
where d.registration_id = r.id and r.status = 'paid';

-- Seat occupancy now reflects actual confirmed diners rather than whole-registration
-- status, so partially-paid groups and moved/split diners are counted correctly.
create or replace view meal_availability as
select
  m.id as meal_id,
  m.total_seats,
  coalesce(count(d.id) filter (where d.deposit_paid and r.status <> 'cancelled'), 0)::int as taken_seats,
  m.total_seats - coalesce(count(d.id) filter (where d.deposit_paid and r.status <> 'cancelled'), 0)::int as remaining_seats
from meals m
left join meal_registrations r on r.meal_id = m.id
left join meal_diners d on d.registration_id = r.id
group by m.id, m.total_seats;
