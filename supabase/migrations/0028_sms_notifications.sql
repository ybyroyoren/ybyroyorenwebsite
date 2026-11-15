-- SMS alerts (SMS4Free) next to e-mail and WhatsApp: who gets which kind of alert. Sends are logged in notification_log.
create table sms_recipients (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  phone text not null unique,   -- international digits only, e.g. 972501234567
  notify_shop_order boolean not null default true,
  notify_event_inquiry boolean not null default true,
  notify_meal_registration boolean not null default true,
  notify_contact_message boolean not null default true,
  created_at timestamptz not null default now()
);
alter table sms_recipients enable row level security;
