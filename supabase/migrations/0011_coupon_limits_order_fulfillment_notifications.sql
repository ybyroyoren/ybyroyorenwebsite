-- ---------- coupon usage limits (single-use / limited count / unlimited) ----------
alter table coupons add column usage_limit_type text not null default 'unlimited'
  check (usage_limit_type in ('single', 'limited', 'unlimited'));
alter table coupons add column usage_limit_count integer
  check (usage_limit_count is null or usage_limit_count > 0);
alter table coupons add column times_used integer not null default 0;
alter table coupons add constraint coupons_limit_count_required_when_limited check (
  usage_limit_type <> 'limited' or usage_limit_count is not null
);

-- ---------- order fulfillment status ----------
-- Separate from `status` (pending/paid/cancelled, which gates payment and
-- receipt logic and must not change meaning). This tracks the kitchen/pickup
-- workflow for an already-paid order.
alter table orders add column fulfillment_status text not null default 'open'
  check (fulfillment_status in ('open', 'prepared', 'completed', 'partially_fulfilled', 'no_show'));

-- ---------- admin notification recipients ----------
-- Replaces the single ADMIN_NOTIFICATION_EMAIL env var with an
-- admin-manageable list, each subscribed per notification type.
create table notification_recipients (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  notify_shop_order boolean not null default true,
  notify_event_inquiry boolean not null default true,
  notify_meal_registration boolean not null default true,
  notify_contact_message boolean not null default true,
  created_at timestamptz not null default now()
);
alter table notification_recipients enable row level security;
