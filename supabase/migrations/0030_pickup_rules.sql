-- Shop pickup rules: days on which pickup is not possible. A rule closes pickup for a date window (from / until /
-- between, any end may be open), for given weekdays (0 = Sunday ... 6 = Saturday), or both ("every Saturday in
-- December"). It applies to the whole shop, or only to carts that contain one of the listed products.
create table pickup_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  start_date date,
  end_date date,
  weekdays smallint[],
  product_ids uuid[],
  message text not null default '',
  message_en text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (start_date is not null or end_date is not null or weekdays is not null),
  check (start_date is null or end_date is null or start_date <= end_date)
);
alter table pickup_rules enable row level security;
